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
import { Plus, Globe, Loader2, MessageSquare, Trash2, RefreshCw, Code, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  crawling: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
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
        user_id: user!.id,
        ai_provider: newProvider,
        ai_model: newModel,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setNewSiteName("");
      setNewSiteUrl("");
      setNewProvider("openai");
      setNewModel("gpt-4o-mini");
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with Greeting */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold">Hello {user?.user_metadata?.full_name || user?.email?.split("@")[0]}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-block h-2 w-2 bg-yellow-400 rounded-full"></span>
              <p className="text-sm text-gray-600">Status: Online</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> New site
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={addSiteMutation.isPending}>
                  {addSiteMutation.isPending ? "Adding..." : "Add site"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : !sites?.length ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center py-20 bg-gray-50">
          <Globe className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No sites connected</h3>
          <p className="text-gray-600 text-sm mb-6">Add your first website to create an AI agent</p>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> New site
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="text-left font-semibold text-gray-700 px-6 py-4">Name</th>
                <th className="text-left font-semibold text-gray-700 px-6 py-4 hidden md:table-cell">Provider</th>
                <th className="text-left font-semibold text-gray-700 px-6 py-4 hidden sm:table-cell">Status</th>
                <th className="text-left font-semibold text-gray-700 px-6 py-4 hidden lg:table-cell">Pages</th>
                <th className="text-right font-semibold text-gray-700 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{site.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" />
                        {site.url}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs font-mono bg-gray-100 border-gray-300">
                        {(site as any).ai_provider || "openai"}/{(site as any).ai_model || "gpt-4o-mini"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <Badge className={statusColors[site.status] || ""} variant="outline">
                      {site.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-gray-600">
                    {site.pages_crawled > 0 ? site.pages_crawled : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        onClick={() => crawlMutation.mutate(site.id)}
                        disabled={crawlMutation.isPending || site.status === "crawling"}
                        title={site.status === "pending" ? "Crawl" : "Re-crawl"}
                      >
                        {site.status === "crawling" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      {site.status === "ready" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-gray-700" asChild title="Test Chat">
                            <Link to={`/chat/${site.id}`}><MessageSquare className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-gray-700" asChild title="Embed Code">
                            <Link to={`/embed/${site.id}`}><Code className="h-4 w-4" /></Link>
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => deleteMutation.mutate(site.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
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

export default Dashboard;
