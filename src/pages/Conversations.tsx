// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, Users, Loader2, ChevronRight, Clock, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";

const Conversations = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: conversations, isLoading: loadingConvos } = useQuery({
    queryKey: ["conversations", selectedSiteId],
    queryFn: async () => {
      let query = supabase.from("conversations").select("*, sites(name, url)").order("updated_at", { ascending: false }).limit(100);
      if (selectedSiteId !== "all") query = query.eq("site_id", selectedSiteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["conversation-messages", selectedConvoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").eq("conversation_id", selectedConvoId!).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedConvoId,
  });

  const selectedConvo = conversations?.find((c) => c.id === selectedConvoId);

  // On mobile, show either list or detail
  const showList = !isMobile || !selectedConvoId;
  const showDetail = !isMobile || !!selectedConvoId;

  const listPanel = (
    <div className={`${isMobile ? "w-full" : "w-80 lg:w-96"} border-r flex flex-col`}>
      <div className="p-4 border-b space-y-3">
        <h1 className="text-lg font-semibold">Conversations</h1>
        <Select value={selectedSiteId} onValueChange={(v) => { setSelectedSiteId(v); setSelectedConvoId(null); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filter by site" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        {loadingConvos ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !conversations?.length ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
          </div>
        ) : (
          <div>
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvoId(convo.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${selectedConvoId === convo.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{(convo as any).sites?.name || "Unknown"}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium truncate">Visitor {convo.visitor_id.slice(0, 8)}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(convo.updated_at), { addSuffix: true })}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const detailPanel = (
    <div className="flex-1 flex flex-col min-w-0">
      {!selectedConvoId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">Select a conversation to view messages</p>
        </div>
      ) : (
        <>
          <div className="px-4 sm:px-6 py-4 border-b bg-card">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedConvoId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">Visitor {selectedConvo?.visitor_id.slice(0, 8)}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {(selectedConvo as any)?.sites?.name} · {formatDistanceToNow(new Date(selectedConvo?.created_at || ""), { addSuffix: true })}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{messages?.length || 0} msgs</Badge>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4 sm:p-6">
            {loadingMessages ? (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !messages?.length ? (
              <p className="text-sm text-muted-foreground text-center py-12">No messages</p>
            ) : (
              <div className="space-y-4 max-w-3xl">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className={`flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center ${msg.role === "user" ? "bg-secondary" : "bg-primary"}`}>
                      {msg.role === "user" ? <User className="h-3.5 w-3.5 text-secondary-foreground" /> : <Users className="h-3.5 w-3.5 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{msg.role === "user" ? "Visitor" : "Sales Rep"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm">
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : <p>{msg.content}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      {showList && listPanel}
      {showDetail && detailPanel}
    </div>
  );
};

export default Conversations;
