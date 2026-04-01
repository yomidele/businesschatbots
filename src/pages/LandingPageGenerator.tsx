import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  // Generate landing page mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSiteId) throw new Error("Please select a Sales Rep first");
      if (!description.trim()) throw new Error("Please add a description for your landing page");

      const site = sites?.find(s => s.id === selectedSiteId);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-landing-page`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            site_id: selectedSiteId,
            business_name: businessName || site?.name || "My Business",
            description,
            products: products.map(p => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image_url: p.image_url,
            })),
            theme,
            cta_type: ctaType,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate landing page");
      }

      return response.json();
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
