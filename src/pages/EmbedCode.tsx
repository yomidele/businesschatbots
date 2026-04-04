// @ts-nocheck
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
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

  const publishedUrl = "https://businesschatbots.lovable.app";

  // Lazy-loading embed script — widget loads ONLY when clicked
  const embedScript = `<!-- AI Sales Rep Widget -->
<script>
(function() {
  var w = document.createElement('div');
  w.id = 'salesrep-widget';
  w.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;';
  document.body.appendChild(w);

  var btn = document.createElement('button');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;background:#10b981;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);';

  var frame = document.createElement('iframe');
  frame.style.cssText = 'width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:none;margin-bottom:12px;';

  var loaded = false;

  w.appendChild(frame);
  w.appendChild(btn);

  btn.onclick = function() {
    if (!loaded) {
      frame.src = '${publishedUrl}/widget/${siteId}';
      loaded = true;
    }
    frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    toast({ title: "Copied!", description: "Paste this into your website's HTML before </body>." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/sites"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Deploy Sales Rep</h1>
          <p className="text-xs text-muted-foreground truncate">{site?.name} — {site?.url}</p>
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Installation code</p>
              <p className="text-xs text-muted-foreground mt-1">
                Paste before the closing {'</body>'} tag on your website. Widget loads only when clicked.
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs w-fit" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed text-muted-foreground">
          {embedScript}
        </pre>
      </div>
    </div>
  );
};

export default EmbedCode;
