// @ts-nocheck
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, ExternalLink, Zap, AlertCircle, Layout } from "lucide-react";
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

  // Fetch all sites
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch products for selected site
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

  // Fetch existing landing pages for selected site
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
      if (error) {
        console.warn("Landing pages query error:", error);
        return [];
      }
      return data || [];
    },
  });

  // Generate landing page client-side and insert directly
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSiteId) throw new Error("Please select a Sales Rep first");
      if (!description.trim()) throw new Error("Please add a description for your landing page");

      const site = sites?.find(s => s.id === selectedSiteId);
      const name = businessName || site?.name || "My Business";
      const landingPageId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const productHTML = products
        .map(p => `
          <div class="product-card">
            ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" />` : '<div class="product-placeholder"></div>'}
            <h3>${p.name}</h3>
            <p class="price">₦${p.price.toLocaleString()}</p>
            <button class="cta-btn">${ctaType === "buy" ? "Buy Now" : ctaType === "contact" ? "Contact Us" : "Book Now"}</button>
          </div>`)
        .join("");

      const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#333}header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:60px 20px;text-align:center}header h1{font-size:3em;margin-bottom:20px}header p{font-size:1.2em;opacity:.9}.products{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;padding:60px 20px;max-width:1200px;margin:0 auto}.product-card{border:1px solid #ddd;border-radius:8px;padding:20px;text-align:center;transition:transform .3s}.product-card:hover{transform:translateY(-5px);box-shadow:0 10px 30px rgba(0,0,0,.1)}.product-card img{width:100%;height:250px;object-fit:cover;border-radius:8px;margin-bottom:15px}.product-placeholder{width:100%;height:250px;background:#f0f0f0;border-radius:8px;margin-bottom:15px}.product-card h3{margin:15px 0}.price{font-size:1.5em;font-weight:bold;color:#667eea;margin:10px 0}.cta-btn{background:#667eea;color:white;border:none;padding:12px 30px;border-radius:5px;font-size:1em;cursor:pointer}.cta-btn:hover{background:#764ba2}</style></head><body><header><h1>${name}</h1><p>${description}</p></header><section class="products">${productHTML}</section></body></html>`;

      // @ts-ignore - landing_pages table on external DB
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
      return { landing_page_id: landingPageId, url: `/store/${landingPageId}` };
    },
    onSuccess: () => {
      toast({ title: "Landing page generated!" });
      queryClient.invalidateQueries({ queryKey: ["landing-pages", selectedSiteId] });
    },
    onError: (error) => {
      toast({
        title: "Error generating landing page",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${url}`);
    toast({ title: "Landing page URL copied!" });
  };

  // Auto-fill business name when site is selected
  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    const site = sites?.find(s => s.id === siteId);
    if (site && !businessName) {
      setBusinessName(site.name);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Landing Page Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a storefront landing page with embedded AI Sales Rep
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate New Landing Page</CardTitle>
          <CardDescription>Customize and create a landing page for your products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Site selector */}
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
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="My Business"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your business and what you offer..."
                  rows={4}
                />
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
                  <p className="text-sm text-muted-foreground">
                    No products found for this Sales Rep. Add products first.
                  </p>
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

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !description.trim()}
                className="w-full"
                size="lg"
              >
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
            <CardDescription>View and manage generated landing pages</CardDescription>
          </CardHeader>
          <CardContent>
            {pagesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : landingPages.length === 0 ? (
              <div className="py-8 text-center">
                <Layout className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No landing page created yet</p>
                <p className="text-xs text-muted-foreground mt-1">Generate one above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {landingPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{page.title || page.id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {page.description?.slice(0, 80) || "Generated landing page"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(`/store/${page.id}`)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/store/${page.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LandingPageGenerator;
