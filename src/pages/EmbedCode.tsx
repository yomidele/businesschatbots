import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const EmbedCode = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: site } = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", siteId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });

  const appUrl = window.location.origin;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const embedScript = `<!-- AgentHub Chat Widget -->
<script>
(function() {
  var w = document.createElement('div');
  w.id = 'agenthub-widget';
  w.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;';
  document.body.appendChild(w);

  var btn = document.createElement('button');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;background:hsl(172,66%,40%);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);';

  var frame = document.createElement('iframe');
  frame.src = '${appUrl}/widget/${siteId}';
  frame.style.cssText = 'width:380px;height:520px;border:none;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:none;margin-bottom:12px;';

  w.appendChild(frame);
  w.appendChild(btn);

  btn.onclick = function() {
    frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    toast({ title: "Copied!", description: "Paste this into your website's HTML." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <p className="font-semibold">Embed Widget — {site?.name}</p>
            <p className="text-xs text-muted-foreground">{site?.url}</p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Embed Code</CardTitle>
            <CardDescription>
              Copy this script and paste it before the closing {'</body>'} tag on your website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {embedScript}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-3 right-3"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmbedCode;
