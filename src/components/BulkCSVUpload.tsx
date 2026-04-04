import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/lib/supabase-external";
import { useToast } from "@/hooks/use-toast";

interface BulkCSVUploadProps {
  siteId: string;
  onSuccess: () => void;
}

interface ParsedRow {
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category: string;
  stock: number | null;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function validateAndParse(headers: string[], rows: string[][]): { valid: ParsedRow[]; errors: string[] } {
  const requiredHeaders = ["name"];
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length) return { valid: [], errors: [`Missing required headers: ${missing.join(", ")}. Required: name, description, price, image_url, category, stock`] };

  const nameIdx = headers.indexOf("name");
  const descIdx = headers.indexOf("description");
  const priceIdx = headers.indexOf("price");
  const imageIdx = headers.indexOf("image_url");
  const catIdx = headers.indexOf("category");
  const stockIdx = headers.indexOf("stock");

  const valid: ParsedRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const name = row[nameIdx]?.trim();
    if (!name) { errors.push(`Row ${rowNum}: missing name — skipped`); return; }

    const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim() : "";
    let price: number | null = null;
    if (priceStr) {
      price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      if (isNaN(price)) { errors.push(`Row ${rowNum}: invalid price "${row[priceIdx]}" — set to null`); price = null; }
    }

    const stockStr = stockIdx >= 0 ? row[stockIdx]?.trim() : "";
    let stock: number | null = null;
    if (stockStr) {
      stock = parseInt(stockStr, 10);
      if (isNaN(stock)) { stock = null; }
    }

    valid.push({
      name,
      description: descIdx >= 0 ? row[descIdx]?.trim() || null : null,
      price,
      image_url: imageIdx >= 0 ? row[imageIdx]?.trim() || null : null,
      category: catIdx >= 0 ? row[catIdx]?.trim() || "general" : "general",
      stock,
    });
  });

  return { valid, errors };
}

const BulkCSVUpload = ({ siteId, onSuccess }: BulkCSVUploadProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please select a .csv file", variant: "destructive" });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);
      if (!headers.length) throw new Error("CSV file is empty or has no headers");

      const { valid, errors } = validateAndParse(headers, rows);
      
      if (!valid.length) {
        setResult({ success: 0, failed: rows.length, errors });
        setUploading(false);
        return;
      }

      // Batch insert in chunks of 100
      let successCount = 0;
      const insertErrors: string[] = [...errors];
      const BATCH = 100;

      for (let i = 0; i < valid.length; i += BATCH) {
        const batch = valid.slice(i, i + BATCH).map(p => ({ ...p, site_id: siteId }));
        const { error } = await supabase.from("products").insert(batch as any);
        if (error) {
          insertErrors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
      }

      setResult({ success: successCount, failed: valid.length - successCount + errors.length, errors: insertErrors });
      if (successCount > 0) onSuccess();
    } catch (err: any) {
      setResult({ success: 0, failed: 0, errors: [err.message] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = "name,description,price,image_url,category,stock\nExample Product,A great product,29.99,,general,100";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="h-4 w-4 mr-2" /> Upload CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Bulk Product Upload</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <code className="text-xs bg-muted px-1 rounded">name, description, price, image_url, category, stock</code>
          </p>
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
            <Download className="h-3 w-3 mr-1" /> Download template
          </Button>

          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading || !siteId} className="w-full">
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : <><Upload className="h-4 w-4 mr-2" /> Select CSV File</>}
          </Button>

          {result && (
            <div className="space-y-2">
              {result.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription>{result.success} products uploaded successfully</AlertDescription>
                </Alert>
              )}
              {result.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{result.failed} rows failed</AlertDescription>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1 border rounded p-2">
                  {result.errors.slice(0, 20).map((e, i) => <p key={i}>{e}</p>)}
                  {result.errors.length > 20 && <p>... and {result.errors.length - 20} more</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCSVUpload;
