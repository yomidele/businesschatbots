import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, ExternalLink, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description?: string;
}

const LandingPageGenerator = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<"modern" | "classic" | "minimal">("modern");
  const [ctaType, setCtaType] = useState<"buy" | "contact" | "book">("buy");

  // Fetch products for this site
  const { data: products = [] } = useQuery({
    queryKey: ["products", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, description")
        .eq("site_id", siteId);
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch site info
  const { data: site } = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("name, logo_url")
        .eq("id", siteId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Generate landing page mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/functions/v1/generate-landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          business_name: businessName || site?.name,
          description,
          products: products.filter((p) => p.id), // Use selected products
          theme,
          cta_type: ctaType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate landing page");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Landing page generated!" });
      queryClient.invalidateQueries({ queryKey: ["landing-pages", siteId] });
      // Reset form
      setBusinessName("");
      setDescription("");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Landing Page Generator</h1>
        <p className="text-muted-foreground mt-2">
          Create a beautiful landing page with embedded AI sales chatbot
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate New Landing Page</CardTitle>
          <CardDescription>Customize and create a landing page for your products</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={site?.name || "My Business"}
              />
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your business and what you offer..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Call to Action</Label>
            <select
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="buy">Buy Now</option>
              <option value="contact">Contact Us</option>
              <option value="book">Book Now</option>
            </select>
          </div>

          <div className="space-y-3">
            <Label>Products to Include ({products.length})</Label>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products found. Create products first to add them to your landing page.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="p-2 border rounded flex items-center gap-2">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">₦{product.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !description}
            className="w-full"
            size="lg"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Landing Page
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Landing Pages */}
      <LandingPagesList siteId={siteId!} onCopyUrl={handleCopyUrl} />
    </div>
  );
};

function LandingPagesList({
  siteId,
  onCopyUrl,
}: {
  siteId: string;
  onCopyUrl: (url: string) => void;
}) {
  const { data: landingPages = [], isLoading } = useQuery({
    queryKey: ["landing-pages", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (landingPages.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Landing Pages</CardTitle>
        <CardDescription>View and manage your generated landing pages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {landingPages.map((page: any) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">{page.title}</p>
                <p className="text-sm text-muted-foreground">{page.description?.slice(0, 60)}...</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopyUrl(`/store/${page.id}`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={`/store/${page.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default LandingPageGenerator;
