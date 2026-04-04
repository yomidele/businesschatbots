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

  const publishedUrl = "https://businessaleschat.vercel.app";

  // Universal embed script — auto-updating, cache-busting
  const embedScript = `<!-- AI Sales Rep Widget -->
<script src="${publishedUrl}/widget.js?t=${Date.now()}" data-site-id="${siteId}" defer><\/script>`;

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
                Paste before the closing {'</body>'} tag on your website. Auto-updates — no need to change embed code when you update features.
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
