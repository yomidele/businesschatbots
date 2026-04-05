// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase-external";
import { StoreThemeProvider } from "@/components/store/StoreThemeProvider";
import StoreHero from "@/components/store/StoreHero";
import ProductGrid from "@/components/store/ProductGrid";
import LayoutSwitcher from "@/components/store/LayoutSwitcher";
import FloatingChatWidget from "@/components/chat/FloatingChatWidget";

interface SiteData {
  id: string;
  name: string;
  url: string;
  slug: string;
  welcome_message: string;
  currency: string;
  industry: string;
  show_chat_on_landing_page: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category: string | null;
  stock: number | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵",
  ZAR: "R", INR: "₹", CAD: "C$", AUD: "A$", BRL: "R$",
};

export default function Store() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<SiteData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "list" | "carousel">(() => {
    try { return (localStorage.getItem(`store_layout_${slug}`) as any) || "grid"; } catch { return "grid"; }
  });
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(`store_layout_${slug}`, layout); } catch {}
  }, [layout, slug]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        // Check if this is a generated landing page (lp_ prefix)
        if (slug.startsWith("lp_")) {
          const { data: lp } = await supabase
            .from("landing_pages")
            .select("*, site_id")
            .eq("id", slug)
            .single();

          if (lp?.html_content) {
            // Also load site for floating chat
            const { data: siteData } = await supabase
              .from("sites")
              .select("id, name, welcome_message, show_chat_on_landing_page")
              .eq("id", lp.site_id)
              .single();
            if (siteData) setSite(siteData as any);
            setGeneratedHtml(lp.html_content);
            setLoading(false);
            return;
          }
        }

        // Try loading via get-website edge function
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eqemgveuvkdyectdzpzy.supabase.co';
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA';

        // Try slug-based lookup
        const { data: siteBySlug } = await supabase
          .from("sites")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!siteBySlug) {
          // Try by ID as fallback
          const { data: siteById } = await supabase
            .from("sites")
            .select("*")
            .eq("id", slug)
            .single();
          if (!siteById) throw new Error("Store not found");
          setSite(siteById);
        } else {
          setSite(siteBySlug);
        }

        const siteId = siteBySlug?.id || slug;

        // Fetch products
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, category, stock")
          .eq("site_id", siteId)
          .order("created_at", { ascending: false });

        setProducts(prods || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load store");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm text-amber-800/60">Loading store...</p>
        </div>
      </div>
    );
  }

  // Render generated HTML in iframe for isolation
  if (generatedHtml) {
    return (
      <div className="w-full min-h-screen relative">
        <iframe
          srcDoc={generatedHtml}
          className="w-full h-screen border-0"
          title="Landing Page"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
        {site && (
          <FloatingChatWidget
            siteId={site.id}
            siteName={site.name}
            welcomeMessage={site.welcome_message}
          />
        )}
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Store not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currSymbol = CURRENCY_SYMBOLS[site.currency || "USD"] || site.currency + " ";

  return (
    <StoreThemeProvider siteId={site.id}>
      <div
        className="min-h-screen w-full"
        style={{
          backgroundColor: "var(--store-bg)",
          color: "var(--store-text)",
          fontFamily: "var(--store-font)",
        }}
      >
        <StoreHero
          businessName={site.name}
          welcomeMessage={site.welcome_message || "Welcome! Browse our products and chat with our AI Sales Rep."}
          chatEnabled={site.show_chat_on_landing_page !== false}
          onExploreClick={() => productsRef.current?.scrollIntoView({ behavior: "smooth" })}
          onChatClick={() => {
            // The floating widget handles this
            const chatBtn = document.querySelector('[aria-label="Open chat"]') as HTMLButtonElement;
            chatBtn?.click();
          }}
        />

        {/* Products Section */}
        <section ref={productsRef} className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Our Products</h2>
              <p className="text-sm opacity-60 mt-1">{products.length} products available</p>
            </div>
            <LayoutSwitcher layout={layout} onChange={setLayout} />
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 opacity-50">
              <p className="text-lg">No products available yet</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            <ProductGrid
              products={products}
              currency={site.currency}
              currencySymbol={currSymbol}
              layout={layout}
            />
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-black/5 py-8 text-center">
          <p className="text-xs opacity-40">
            Powered by AI Sales Rep • {site.name}
          </p>
        </footer>

        {/* Global Floating Chat Widget - always visible */}
        <FloatingChatWidget
          siteId={site.id}
          siteName={site.name}
          welcomeMessage={site.welcome_message}
        />
      </div>
    </StoreThemeProvider>
  );
}
