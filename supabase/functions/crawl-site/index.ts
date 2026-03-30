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
    const apifyKey = Deno.env.get("APIFY_API_KEY");

    if (!firecrawlKey && !apifyKey) {
      return new Response(JSON.stringify({ error: "No crawling service configured. Set FIRECRAWL_API_KEY or APIFY_API_KEY." }), {
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

    let formattedUrl = site.url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Clear old chunks and products (re-crawl)
    await supabase.from("knowledge_chunks").delete().eq("site_id", siteId);
    await supabase.from("products").delete().eq("site_id", siteId);

    let crawledCount = 0;
    let crawlMethod = "firecrawl";

    // Try Firecrawl first
    if (firecrawlKey) {
      try {
        crawledCount = await crawlWithFirecrawl(supabase, siteId, formattedUrl, firecrawlKey);
        console.log(`Firecrawl succeeded: ${crawledCount} pages`);
      } catch (err) {
        console.error("Firecrawl failed, trying Apify fallback:", err);
        crawledCount = 0;
      }
    }

    // Fallback to Apify if Firecrawl failed or unavailable
    if (crawledCount === 0 && apifyKey) {
      try {
        crawlMethod = "apify";
        crawledCount = await crawlWithApify(supabase, siteId, formattedUrl, apifyKey);
        console.log(`Apify succeeded: ${crawledCount} pages`);
      } catch (err) {
        console.error("Apify also failed:", err);
      }
    }

    if (crawledCount === 0) {
      await supabase.from("sites").update({ status: "error" }).eq("id", siteId);
      return new Response(JSON.stringify({ error: "All crawl methods failed. Check your API credits and try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update site status
    await supabase.from("sites").update({
      status: "ready",
      pages_crawled: crawledCount,
      last_crawled_at: new Date().toISOString(),
    }).eq("id", siteId);

    return new Response(JSON.stringify({ success: true, pagesCrawled: crawledCount, method: crawlMethod }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("crawl-site error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Firecrawl ───
async function crawlWithFirecrawl(supabase: any, siteId: string, url: string, apiKey: string): Promise<number> {
  console.log("Mapping site with Firecrawl:", url);
  const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit: 50, includeSubdomains: false }),
  });
  const mapData = await mapRes.json();

  if (!mapRes.ok) {
    throw new Error(`Firecrawl map failed: ${mapData.error || mapRes.status}`);
  }

  const urls = (mapData.links || []).slice(0, 20);
  console.log(`Firecrawl found ${urls.length} URLs`);

  let crawledCount = 0;
  for (const pageUrl of urls) {
    try {
      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, formats: ["markdown"], onlyMainContent: true }),
      });

      if (!scrapeRes.ok) continue;

      const scrapeData = await scrapeRes.json();
      const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || "";

      if (!markdown || markdown.length < 50) continue;

      const chunks = splitIntoChunks(markdown, 1000);
      const category = inferCategory(pageUrl, title, markdown);

      for (const chunk of chunks) {
        await supabase.from("knowledge_chunks").insert({
          site_id: siteId, source_url: pageUrl, category, content: chunk, title,
        });
      }

      // Extract products from page content
      const extractedProducts = extractProducts(markdown, title, pageUrl);
      for (const product of extractedProducts) {
        await supabase.from("products").insert({ site_id: siteId, ...product });
      }
      crawledCount++;
    } catch (err) {
      console.error(`Firecrawl scrape error for ${pageUrl}:`, err);
    }
  }
  return crawledCount;
}

// ─── Apify (Website Content Crawler) ───
async function crawlWithApify(supabase: any, siteId: string, url: string, apiKey: string): Promise<number> {
  console.log("Starting Apify Website Content Crawler for:", url);

  // Start the actor run - use playwright for JS-rendered sites
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxCrawlPages: 20,
        crawlerType: "playwright:adaptive",
        maxConcurrency: 5,
        proxyConfiguration: { useApifyProxy: true },
      }),
    }
  );

  if (!runRes.ok) {
    const errText = await runRes.text();
    throw new Error(`Apify run start failed [${runRes.status}]: ${errText}`);
  }

  const runData = await runRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  console.log(`Apify run started: ${runId}`);

  // Poll for completion (max 5 min)
  const maxWait = 300_000;
  const pollInterval = 5_000;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise(r => setTimeout(r, pollInterval));
    elapsed += pollInterval;

    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
    );
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData.data?.status;
    console.log(`Apify run status: ${status} (${elapsed / 1000}s)`);

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }

  // Fetch results from dataset
  const datasetRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}&format=json&limit=20`
  );

  if (!datasetRes.ok) {
    throw new Error(`Failed to fetch Apify dataset: ${datasetRes.status}`);
  }

  const items = await datasetRes.json();
  console.log(`Apify returned ${items.length} items. Sample keys: ${items.length > 0 ? Object.keys(items[0]).join(', ') : 'none'}`);
  let crawledCount = 0;

  for (const item of items) {
    try {
      // Website Content Crawler returns 'text' field for extracted content
      const markdown = item.text || item.markdown || item.body || item.html || "";
      const title = item.metadata?.title || item.title || item.pageTitle || "";
      const pageUrl = item.url || item.loadedUrl || url;

      console.log(`Processing: ${pageUrl} - content length: ${markdown.length}, title: ${title}`);
      if (!markdown || markdown.length < 20) continue;

      const chunks = splitIntoChunks(markdown, 1000);
      const category = inferCategory(pageUrl, title, markdown);

      for (const chunk of chunks) {
        await supabase.from("knowledge_chunks").insert({
          site_id: siteId, source_url: pageUrl, category, content: chunk, title,
        });
      }

      // Extract products from page content
      const extractedProducts = extractProducts(markdown, title, pageUrl);
      for (const product of extractedProducts) {
        await supabase.from("products").insert({ site_id: siteId, ...product });
      }
      crawledCount++;
    } catch (err) {
      console.error("Apify item processing error:", err);
    }
  }

  return crawledCount;
}

// ─── Utilities ───
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

// Extract products/services from page content
function extractProducts(content: string, title: string, sourceUrl: string): Array<{
  name: string; description: string | null; price: number | null; category: string; image_url: string | null;
}> {
  const products: Array<any> = [];
  const lines = content.split("\n");
  
  // Look for price patterns
  const priceRegex = /[\$₦€£]\s*[\d,]+\.?\d*/g;
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  
  // Detect product-like sections (headers followed by price)
  let currentProduct: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect headers as potential product names
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      if (currentProduct?.name) {
        products.push(currentProduct);
      }
      currentProduct = { name: headerMatch[1].trim(), description: null, price: null, category: "general", image_url: null };
      continue;
    }
    
    if (currentProduct) {
      // Look for prices
      const priceMatch = line.match(/[\$₦€£]\s*([\d,]+\.?\d*)/);
      if (priceMatch && !currentProduct.price) {
        currentProduct.price = parseFloat(priceMatch[1].replace(",", ""));
      }
      
      // Look for images
      const imgMatch = line.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
      if (imgMatch && !currentProduct.image_url) {
        currentProduct.image_url = imgMatch[1];
      }
      
      // Collect description (first non-empty, non-header line)
      if (!currentProduct.description && line.length > 10 && !line.startsWith("#") && !line.startsWith("!")) {
        currentProduct.description = line.slice(0, 200);
      }
    }
  }
  
  if (currentProduct?.name) {
    products.push(currentProduct);
  }
  
  // Only return items that look like actual products (have a price or are on product pages)
  const isProductPage = sourceUrl.toLowerCase().includes("product") || 
    sourceUrl.toLowerCase().includes("shop") ||
    sourceUrl.toLowerCase().includes("service") ||
    title.toLowerCase().includes("product") ||
    title.toLowerCase().includes("pricing");
    
  return products.filter(p => p.price || isProductPage).slice(0, 10);
}
