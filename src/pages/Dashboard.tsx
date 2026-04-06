// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Loader2, MessageSquare, Trash2, RefreshCw, Code, ExternalLink, Store, Wallet, User } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  crawling: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

const storeTypeConfig = {
  storefront: { label: "Storefront", icon: Store, color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Simple chat-to-buy. No login required." },
  account: { label: "Account Store", icon: User, color: "bg-blue-100 text-blue-700 border-blue-200", desc: "Users login to track orders." },
  wallet: { label: "Wallet Platform", icon: Wallet, color: "bg-purple-100 text-purple-700 border-purple-200", desc: "Users fund wallet, then purchase." },
};

const AI_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  openai: {
    label: "OpenAI",
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  groq: {
    label: "Groq",
    models: [
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { value: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
};

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newProvider, setNewProvider] = useState("openai");
  const [newModel, setNewModel] = useState("gpt-4o-mini");
  const [newStoreType, setNewStoreType] = useState("storefront");
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
      const storeConfig = {
        storefront: { auth_required: false, wallet_enabled: false, payment_mode: "direct" },
        account: { auth_required: true, wallet_enabled: false, payment_mode: "direct" },
        wallet: { auth_required: true, wallet_enabled: true, payment_mode: "wallet" },
      }[newStoreType] || { auth_required: false, wallet_enabled: false, payment_mode: "direct" };

      const { error } = await supabase.from("sites").insert({
        name: newSiteName,
        url: newSiteUrl,
        user_id: user!.id,
        ai_provider: newProvider,
        ai_model: newModel,
        store_type: newStoreType,
        ...storeConfig,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setNewSiteName("");
      setNewSiteUrl("");
      setNewProvider("openai");
      setNewModel("gpt-4o-mini");
      setNewStoreType("storefront");
      setDialogOpen(false);
      toast({ title: "Site added", description: "Now crawl the site to build its knowledge base." });
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
      toast({ title: "Crawl complete", description: `Processed ${data.pagesCrawled} pages.` });
    },
    onError: (err) => toast({ title: "Crawl failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", siteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      toast({ title: "Site deleted" });
    },
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold">Hello {user?.user_metadata?.full_name || user?.email?.split("@")[0]}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2 w-2 bg-yellow-400 rounded-full"></span>
              <p className="text-sm text-muted-foreground">Status: Online</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" /> New site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Connect a website</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addSiteMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Site name</Label>
                  <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} required placeholder="My Business" />
                </div>
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input value={newSiteUrl} onChange={(e) => setNewSiteUrl(e.target.value)} required placeholder="https://example.com" />
                </div>

                {/* Store Type Selection */}
                <div className="space-y-2">
                  <Label>Store Type</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(storeTypeConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNewStoreType(key)}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                            newStoreType === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <Select value={newProvider} onValueChange={(v) => { setNewProvider(v); setNewModel(AI_MODELS[v].models[0].value); }}>
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
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* API Config for wallet/account stores */}
                {newStoreType !== "storefront" && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">
                      {newStoreType === "wallet" 
                        ? "💡 Wallet API endpoints can be configured after creation in site settings."
                        : "💡 Account API endpoints can be configured after creation in site settings."}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={addSiteMutation.isPending}>
                  {addSiteMutation.isPending ? "Adding..." : "Add site"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !sites?.length ? (
        <div className="border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center py-20 bg-muted/30">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No sites connected</h3>
          <p className="text-muted-foreground text-sm mb-6">Add your first website to create an AI agent</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New site
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-semibold px-6 py-4">Name</th>
                  <th className="text-left font-semibold px-6 py-4">Type</th>
                  <th className="text-left font-semibold px-6 py-4">Provider</th>
                  <th className="text-left font-semibold px-6 py-4">Status</th>
                  <th className="text-left font-semibold px-6 py-4">Pages</th>
                  <th className="text-right font-semibold px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => {
                  const typeInfo = storeTypeConfig[(site as any).store_type || "storefront"] || storeTypeConfig.storefront;
                  const TypeIcon = typeInfo.icon;
                  return (
                    <tr key={site.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium">{site.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" />{site.url}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                          <TypeIcon className="h-3 w-3 mr-1" />{typeInfo.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs font-mono bg-muted">
                          {(site as any).ai_provider || "openai"}/{(site as any).ai_model || "gpt-4o-mini"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusColors[site.status] || ""} variant="outline">{site.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {site.pages_crawled > 0 ? site.pages_crawled : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => crawlMutation.mutate(site.id)} disabled={crawlMutation.isPending || site.status === "crawling"} title={site.status === "pending" ? "Crawl" : "Re-crawl"}>
                            {site.status === "crawling" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                          {site.status === "ready" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Test Chat">
                                <Link to={`/chat/${site.id}`}><MessageSquare className="h-4 w-4" /></Link>
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Embed Code">
                                <Link to={`/embed/${site.id}`}><Code className="h-4 w-4" /></Link>
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => deleteMutation.mutate(site.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {sites.map((site) => {
              const typeInfo = storeTypeConfig[(site as any).store_type || "storefront"] || storeTypeConfig.storefront;
              const TypeIcon = typeInfo.icon;
              return (
                <div key={site.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{site.url}</p>
                    </div>
                    <Badge className={statusColors[site.status] || ""} variant="outline">{site.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />{typeInfo.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono bg-muted">
                      {(site as any).ai_provider || "openai"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => crawlMutation.mutate(site.id)} disabled={crawlMutation.isPending || site.status === "crawling"}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Crawl
                    </Button>
                    {site.status === "ready" && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/chat/${site.id}`}><MessageSquare className="h-3 w-3 mr-1" /> Chat</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/embed/${site.id}`}><Code className="h-3 w-3 mr-1" /> Embed</Link>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="hover:text-destructive ml-auto" onClick={() => deleteMutation.mutate(site.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
