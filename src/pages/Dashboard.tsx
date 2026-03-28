import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Globe, Loader2, LogOut, MessageSquare, Trash2, RefreshCw, Code } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  crawling: "bg-warning/10 text-warning",
  ready: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setNewSiteName("");
      setNewSiteUrl("");
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">AgentHub</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Sites</h1>
            <p className="text-muted-foreground">Connect websites to create AI support agents</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Site</Button>
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
                <Button type="submit" className="w-full" disabled={addSiteMutation.isPending}>
                  {addSiteMutation.isPending ? "Adding..." : "Add site"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !sites?.length ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No sites connected</h3>
              <p className="text-muted-foreground text-sm mb-4">Add your first website to create an AI agent</p>
              <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Site</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card key={site.id} className="shadow-card hover:shadow-elevated transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{site.name}</CardTitle>
                      <CardDescription className="truncate">{site.url}</CardDescription>
                    </div>
                    <Badge className={statusColors[site.status] || ""} variant="secondary">
                      {site.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    {site.pages_crawled > 0 ? `${site.pages_crawled} pages indexed` : "Not yet crawled"}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => crawlMutation.mutate(site.id)}
                      disabled={crawlMutation.isPending || site.status === "crawling"}
                    >
                      {site.status === "crawling" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      {site.status === "pending" ? "Crawl" : "Re-crawl"}
                    </Button>
                    {site.status === "ready" && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/chat/${site.id}`}><MessageSquare className="h-3 w-3 mr-1" /> Test Chat</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/embed/${site.id}`}><Code className="h-3 w-3 mr-1" /> Embed</Link>
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(site.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
