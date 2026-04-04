import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No landing page specified");
      setLoading(false);
      return;
    }

    const fetchPage = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || "https://eqemgveuvkdyectdzpzy.supabase.co";
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA";

        const resp = await fetch(
          `${baseUrl}/functions/v1/get-landing-page?slug=${encodeURIComponent(slug)}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (!resp.ok) {
          setError("Landing page not found");
          return;
        }

        const contentType = resp.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          setHtml(await resp.text());
        } else {
          const data = await resp.json();
          if (data.html) {
            setHtml(data.html);
          } else {
            setError("Landing page not found");
          }
        }
      } catch {
        setError("Could not load landing page");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error || "Page not found"}</span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      className="w-screen h-screen border-0"
      title="Landing Page"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
};

export default LandingPage;
