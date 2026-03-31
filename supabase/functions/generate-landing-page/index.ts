import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandingPageRequest {
  site_id: string;
  business_name: string;
  description: string;
  products: Array<{ id: string; name: string; price: number; image_url?: string }>;
  theme?: "modern" | "classic" | "minimal";
  cta_text?: string;
  cta_type?: "buy" | "contact" | "book";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: LandingPageRequest = await req.json();
    const { site_id, business_name, description, products, theme = "modern", cta_type = "buy" } = payload;

    if (!site_id || !business_name) {
      return new Response(
        JSON.stringify({ error: "site_id and business_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate site exists
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, name, logo_url, website_url")
      .eq("id", site_id)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate landing page HTML
    const landingPageId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const landingPageUrl = `/store/${landingPageId}`;

    const htmlContent = generateLandingPageHTML({
      businessName: business_name,
      description,
      products,
      theme,
      siteId: site_id,
      logo: site.logo_url,
      ctaType: cta_type,
    });

    // Store landing page record in database
    const { data: landingPage, error: insertError } = await supabase
      .from("landing_pages")
      .insert({
        id: landingPageId,
        site_id,
        title: business_name,
        description,
        html_content: htmlContent,
        theme,
        products_used: products,
        cta_type,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create landing page", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        landing_page_id: landingPageId,
        url: landingPageUrl,
        html_content: htmlContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating landing page:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateLandingPageHTML(options: {
  businessName: string;
  description: string;
  products: Array<{ id: string; name: string; price: number; image_url?: string }>;
  theme: string;
  siteId: string;
  logo?: string;
  ctaType: string;
}): string {
  const { businessName, description, products, siteId, logo, ctaType } = options;

  const productHTML = products
    .map(
      (p) => `
    <div class="product-card">
      ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" />` : '<div class="product-placeholder"></div>'}
      <h3>${p.name}</h3>
      <p class="price">₦${p.price.toLocaleString()}</p>
      <button class="cta-btn" onclick="openChat('${p.id}')">
        ${ctaType === "buy" ? "Buy Now" : ctaType === "contact" ? "Contact Us" : "Book Now"}
      </button>
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; text-align: center; }
    header h1 { font-size: 3em; margin-bottom: 20px; }
    header p { font-size: 1.2em; opacity: 0.9; }
    
    .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; padding: 60px 20px; }
    .product-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; transition: transform 0.3s; }
    .product-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .product-card img { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
    .product-placeholder { width: 100%; height: 250px; background: #f0f0f0; border-radius: 8px; margin-bottom: 15px; }
    .product-card h3 { margin: 15px 0; }
    .product-card .price { font-size: 1.5em; font-weight: bold; color: #667eea; margin: 10px 0; }
    
    .cta-btn { background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 5px; font-size: 1em; cursor: pointer; transition: background 0.3s; }
    .cta-btn:hover { background: #764ba2; }
    
    .chatbot-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      ${logo ? `<img src="${logo}" alt="${businessName}" style="max-height: 80px; margin-bottom: 20px;">` : ""}
      <h1>${businessName}</h1>
      <p>${description}</p>
    </div>
  </header>
  
  <section class="products">
    <div class="container" style="grid-column: 1/-1;">
      <h2 style="text-align: center; margin-bottom: 40px;">Our Products</h2>
    </div>
    ${productHTML}
  </section>
  
  <!-- Sales Rep Chatbot Widget -->
  <div id="salesrep-chatbot" data-site-id="${siteId}"></div>
  
  <script src="/chatbot-widget.js"></script>
  <script>
    function openChat(productId) {
      const chatEl = document.getElementById('salesrep-chatbot');
      if (chatEl) {
        chatEl.style.display = 'block';
        // Trigger message about product
        window.dispatchEvent(new CustomEvent('openProductChat', { detail: { productId } }));
      }
    }
  </script>
</body>
</html>`;
}
