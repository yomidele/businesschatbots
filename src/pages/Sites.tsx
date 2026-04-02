// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Loader2, MessageSquare, Trash2, RefreshCw, Code, ExternalLink, Store, Copy } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  crawling: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const INDUSTRIES = [
  { value: "food", label: "Food & Restaurant" },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "electronics", label: "Electronics & Tech" },
  { value: "real_estate", label: "Real Estate" },
  { value: "services", label: "Services & Consulting" },
  { value: "health", label: "Health & Beauty" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "NGN", label: "NGN (₦)", symbol: "₦" },
  { value: "KES", label: "KES (KSh)", symbol: "KSh" },
  { value: "GHS", label: "GHS (₵)", symbol: "₵" },
  { value: "ZAR", label: "ZAR (R)", symbol: "R" },
  { value: "INR", label: "INR (₹)", symbol: "₹" },
  { value: "CAD", label: "CAD (C$)", symbol: "C$" },
  { value: "AUD", label: "AUD (A$)", symbol: "A$" },
  { value: "BRL", label: "BRL (R$)", symbol: "R$" },
];

const AI_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  groq: {
    label: "Groq",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
};

// Helper function to generate URL-friendly slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .substring(0, 50);
};

const Sites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newProvider, setNewProvider] = useState("openai");
  const [newModel, setNewModel] = useState("gpt-4o-mini");
  const [newIndustry, setNewIndustry] = useState("other");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sites, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addSiteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sites").insert({
        name: newSiteName,
        url: newSiteUrl,
        slug: newSlug || generateSlug(newSiteName),
        user_id: user!.id,
        ai_provider: newProvider,
        ai_model: newModel,
        industry: newIndustry,
        currency: newCurrency,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setNewSiteName("");
      setNewSiteUrl("");
      setNewSlug("");
      setNewProvider("openai");
      setNewModel("gpt-4o-mini");
      setNewIndustry("other");
      setNewCurrency("USD");
      setDialogOpen(false);
      toast({ title: "Sales Rep created", description: "Crawl the site to train your AI Sales Rep." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const crawlMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { data, error } = await supabase.functions.invoke("crawl-site", { body: { siteId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Training complete", description: `Processed ${data.pagesCrawled} pages.` });
    },
    onError: (err) => toast({ title: "Training failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", siteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      toast({ title: "Sales Rep removed" });
    },
  });

  const copyLandingPageUrl = (slug: string) => {
    const url = `${window.location.origin}/store/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Landing page URL copied to clipboard" });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Sales Reps</h1>
          <p className="text-sm text-muted-foreground mt-1">Deploy and manage your digital sales workforce</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Sales Rep</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Deploy a new AI Sales Rep</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSiteMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input
                  value={newSiteName}
                  onChange={(e) => {
                    setNewSiteName(e.target.value);
                    setNewSlug(generateSlug(e.target.value));
                  }}
                  required
                  placeholder="My Business"
                />
              </div>
              <div className="space-y-2">
                <Label>Landing page URL slug</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSlug}
                    onChange={(e) => setNewSlug(generateSlug(e.target.value))}
                    placeholder="my-business"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewSlug(generateSlug(newSiteName))}
                  >
                    Auto
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {newSlug ? `Your landing page: /store/${newSlug}` : "Enter a name to auto-generate"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  required
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={newIndustry} onValueChange={setNewIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select
                    value={newProvider}
                    onValueChange={(v) => {
                      setNewProvider(v);
                      setNewModel(AI_MODELS[v].models[0].value);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={newModel} onValueChange={setNewModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AI_MODELS[newProvider].models.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={addSiteMutation.isPending}>
                {addSiteMutation.isPending ? "Creating..." : "Deploy Sales Rep"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !sites?.length ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 sm:py-20 px-4">
          <Globe className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No Sales Reps deployed</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">
            Deploy your first AI Sales Rep to start converting visitors
          </p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Sales Rep
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Business</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Landing Page</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Industry</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[180px]">{site.url}</span>
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {site.slug ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{site.slug}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => (site as any).slug && copyLandingPageUrl((site as any).slug)}
                          title="Copy landing page URL"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs capitalize">
                      {((site as any).industry || "other").replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge className={statusColors[site.status] || ""} variant="outline">
                      {site.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => crawlMutation.mutate(site.id)}
                        disabled={crawlMutation.isPending || site.status === "crawling"}
                        title="Train"
                      >
                        {site.status === "crawling" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {site.slug && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          asChild
                          title="Landing Page"
                        >
                          <a href={`/store/${site.slug}`} target="_blank" rel="noopener noreferrer">
                            <Store className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {site.status === "ready" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            asChild
                            title="Test"
                          >
                            <Link to={`/chat/${site.id}`}>
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Embed">
                            <Link to={`/embed/${site.id}`}>
                              <Code className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(site.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Sites;
