// @ts-nocheck
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import ChatInterface from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const ChatTest = () => {
  const { siteId } = useParams<{ siteId: string }>();

  const { data: site, isLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").eq("id", siteId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b bg-card px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-sm font-semibold">Test Chat — {site?.name}</p>
          <p className="text-xs text-muted-foreground">{site?.url}</p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatInterface siteId={siteId!} siteName={site?.name} />
      </div>
    </div>
  );
};

export default ChatTest;
