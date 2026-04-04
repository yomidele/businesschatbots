import { useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

interface WebsiteData {
  id: string;
  name: string;
  welcome_message: string;
  chatbot_config: {
    enabled: boolean;
    welcome_message: string;
  };
  theme: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    button_color: string;
  } | null;
}

const ChatWidget = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const websiteId = siteId || queryId;

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!websiteId) {
      setError("No website ID provided");
      setLoading(false);
      return;
    }

    const fetchWebsite = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || "https://eqemgveuvkdyectdzpzy.supabase.co";
        const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA";

        const resp = await fetch(
          `${baseUrl}/functions/v1/get-website?id=${encodeURIComponent(websiteId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        const data = await resp.json();

        if (!resp.ok || !data.success) {
          setError(data.error || "Website not found");
          return;
        }

        setWebsite(data.website);
      } catch (e) {
        setError("Chat unavailable. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [websiteId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error || "Chat unavailable"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-card">
      <ChatInterface
        siteId={website.id}
        siteName={website.name}
        embedded
        welcomeMessage={website.chatbot_config?.welcome_message || website.welcome_message}
      />
    </div>
  );
};

export default ChatWidget;
