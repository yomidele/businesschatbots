// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Copy, ExternalLink, Zap, AlertCircle, Layout, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description?: string;
}

const LandingPageGenerator = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<"modern" | "classic" | "minimal">("modern");
  const [ctaType, setCtaType] = useState<"buy" | "contact" | "book">("buy");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", selectedSiteId],
    enabled: !!selectedSiteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, description")
        .eq("site_id", selectedSiteId);
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: landingPages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["landing-pages", selectedSiteId],
    enabled: !!selectedSiteId,
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("site_id", selectedSiteId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSiteId) throw new Error("Please select a Sales Rep first");
      if (!description.trim()) throw new Error("Please add a description");

      const site = sites?.find(s => s.id === selectedSiteId);
      const name = businessName || site?.name || "My Business";
      const landingPageId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const themeColors: Record<string, { bg: string; primary: string; accent: string; text: string }> = {
        modern: { bg: "#0f172a", primary: "#3b82f6", accent: "#60a5fa", text: "#f8fafc" },
        classic: { bg: "#fefce8", primary: "#d97706", accent: "#f59e0b", text: "#1c1917" },
        minimal: { bg: "#ffffff", primary: "#18181b", accent: "#a1a1aa", text: "#09090b" },
      };
      const t = themeColors[theme];

      const productHTML = products
        .map(p => `
          <div style="background:${theme === 'modern' ? '#1e293b' : theme === 'minimal' ? '#fafafa' : '#fffbeb'};border-radius:16px;overflow:hidden;transition:transform 0.3s">
            ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" style="width:100%;height:220px;object-fit:cover" />` : `<div style="width:100%;height:220px;background:${t.accent}22;display:flex;align-items:center;justify-content:center;font-size:3em">📦</div>`}
            <div style="padding:20px">
              <h3 style="font-weight:800;font-size:1.1em;color:${t.text};margin:0 0 8px">${p.name}</h3>
              <p style="font-size:1.4em;font-weight:900;color:${t.primary};margin:0 0 16px">₦${p.price?.toLocaleString()}</p>
              <button style="width:100%;padding:12px;border:none;border-radius:10px;background:${t.primary};color:white;font-weight:700;cursor:pointer;font-size:.95em">${ctaType === "buy" ? "Buy Now" : ctaType === "contact" ? "Contact Us" : "Book Now"}</button>
            </div>
          </div>`)
        .join("");

      const chatbotScript = `<script>window.CHATBOT_CONFIG={businessId:"${selectedSiteId}",themeColor:"${t.primary}"};<\/script><script src="${window.location.origin}/chatbot.js"><\/script>`;

      const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:${t.bg};color:${t.text}}header{padding:60px 20px 80px;text-align:center;background:linear-gradient(135deg,${t.primary},${t.accent})}header h1{font-size:clamp(2em,5vw,3.5em);font-weight:900;color:white;letter-spacing:-0.02em}header p{margin-top:16px;font-size:1.15em;color:rgba(255,255,255,0.85);max-width:600px;margin-left:auto;margin-right:auto}.products{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;padding:40px 20px;max-width:1200px;margin:0 auto}footer{text-align:center;padding:40px;opacity:.4;font-size:.8em}@media(max-width:640px){.products{grid-template-columns:1fr;padding:20px}header{padding:40px 16px 60px}}</style></head><body><header><h1>${name}</h1><p>${description}</p></header><section class="products">${productHTML}</section><footer>Powered by AI Sales Rep</footer>${chatbotScript}</body></html>`;

      const { error } = await supabase.from("landing_pages").insert({
        id: landingPageId,
        site_id: selectedSiteId,
        title: name,
        description,
        html_content: htmlContent,
        theme,
        products_used: products,
        cta_type: ctaType,
      });

      if (error) throw new Error(error.message);
      return { landing_page_id: landingPageId };
    },
    onSuccess: () => {
      toast({ title: "Landing page generated!" });
      queryClient.invalidateQueries({ queryKey: ["landing-pages", selectedSiteId] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("landing_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Landing page deleted" });
      queryClient.invalidateQueries({ queryKey: ["landing-pages", selectedSiteId] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const handleCopyUrl = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/store/${id}`);
    toast({ title: "URL copied!" });
  };

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    const site = sites?.find(s => s.id === siteId);
    if (site && !businessName) setBusinessName(site.name);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Landing Page Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Create storefront pages with your AI Sales Rep</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate New Landing Page</CardTitle>
          <CardDescription>Customize and create a landing page for your products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Select Sales Rep *</Label>
            <Select value={selectedSiteId} onValueChange={handleSiteChange}>
              <SelectTrigger><SelectValue placeholder="Choose a Sales Rep..." /></SelectTrigger>
              <SelectContent>
                {sites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedSiteId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Select a Sales Rep to generate a landing page.</AlertDescription>
            </Alert>
          )}

          {selectedSiteId && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Business" />
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern Dark</SelectItem>
                      <SelectItem value="classic">Classic Warm</SelectItem>
                      <SelectItem value="minimal">Minimal Clean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your business..." rows={4} />
              </div>

              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Select value={ctaType} onValueChange={(v) => setCtaType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy Now</SelectItem>
                    <SelectItem value="contact">Contact Us</SelectItem>
                    <SelectItem value="book">Book Now</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Products ({products.length})</Label>
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products found. Add products first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="p-2 border rounded-lg flex items-center gap-2">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Layout className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          {product.price && <p className="text-xs text-muted-foreground">₦{product.price.toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !description.trim()} className="w-full" size="lg">
                {generateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" /> Generate Landing Page</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing Landing Pages */}
      {selectedSiteId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Landing Pages</CardTitle>
            <CardDescription>View, share, or delete your landing pages</CardDescription>
          </CardHeader>
          <CardContent>
            {pagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : landingPages.length === 0 ? (
              <div className="py-8 text-center">
                <Layout className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No landing pages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {landingPages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{page.title || page.id}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.description?.slice(0, 80) || "Generated landing page"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(page.created_at).toLocaleDateString()} • {page.view_count || 0} views
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(page.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/store/${page.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: page.id, title: page.title })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Landing Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPageGenerator;
