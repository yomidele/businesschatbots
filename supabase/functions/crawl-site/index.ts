import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { siteId } = await req.json();
    if (!siteId) {
      return new Response(JSON.stringify({ error: "siteId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to crawling
    await supabase.from("sites").update({ status: "crawling" }).eq("id", siteId);

    // Step 1: Map the site to get URLs
    let formattedUrl = site.url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Mapping site:", formattedUrl);
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: formattedUrl, limit: 50, includeSubdomains: false }),
    });
    const mapData = await mapRes.json();
    
    if (!mapRes.ok) {
      console.error("Map failed:", mapData);
      await supabase.from("sites").update({ status: "error" }).eq("id", siteId);
      return new Response(JSON.stringify({ error: "Failed to map site" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urls = (mapData.links || []).slice(0, 20); // Limit to 20 pages
    console.log(`Found ${urls.length} URLs`);

    // Step 2: Scrape each URL
    // Clear old chunks first
    await supabase.from("knowledge_chunks").delete().eq("site_id", siteId);

    let crawledCount = 0;
    for (const pageUrl of urls) {
      try {
        console.log("Scraping:", pageUrl);
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: true }),
        });

        if (!scrapeRes.ok) {
          console.error(`Failed to scrape ${pageUrl}: ${scrapeRes.status}`);
          continue;
        }

        const scrapeData = await scrapeRes.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || "";

        if (!markdown || markdown.length < 50) continue;

        // Split into chunks (~1000 chars each)
        const chunks = splitIntoChunks(markdown, 1000);
        
        // Infer category from URL/title
        const category = inferCategory(pageUrl, title, markdown);

        for (const chunk of chunks) {
          await supabase.from("knowledge_chunks").insert({
            site_id: siteId,
            source_url: pageUrl,
            category,
            content: chunk,
            title,
          });
        }

        crawledCount++;
      } catch (err) {
        console.error(`Error scraping ${pageUrl}:`, err);
      }
    }

    // Update site status
    await supabase.from("sites").update({
      status: "ready",
      pages_crawled: crawledCount,
      last_crawled_at: new Date().toISOString(),
    }).eq("id", siteId);

    return new Response(JSON.stringify({ success: true, pagesCrawled: crawledCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("crawl-site error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function splitIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";
  
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function inferCategory(url: string, title: string, content: string): string {
  const lower = (url + " " + title + " " + content.slice(0, 200)).toLowerCase();
  if (lower.includes("pric") || lower.includes("plan") || lower.includes("cost")) return "pricing";
  if (lower.includes("faq") || lower.includes("frequently")) return "faq";
  if (lower.includes("contact") || lower.includes("reach") || lower.includes("support")) return "contact";
  if (lower.includes("about") || lower.includes("team") || lower.includes("mission")) return "about";
  if (lower.includes("policy") || lower.includes("terms") || lower.includes("privacy")) return "policy";
  if (lower.includes("product") || lower.includes("feature")) return "product";
  if (lower.includes("service")) return "service";
  return "general";
}
