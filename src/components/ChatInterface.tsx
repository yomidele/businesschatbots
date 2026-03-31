import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users, User, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

type ChatInterfaceProps = {
  siteId: string;
  siteName?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  embedded?: boolean;
  welcomeMessage?: string;
};

const getVisitorId = (): string => {
  const key = "salesrep_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
};

const getCachedMessages = (siteId: string): Msg[] => {
  try { const raw = localStorage.getItem(`salesrep_msgs_${siteId}`); return raw ? JSON.parse(raw) : []; } catch { return []; }
};

const cacheMessages = (siteId: string, msgs: Msg[]) => {
  try { localStorage.setItem(`salesrep_msgs_${siteId}`, JSON.stringify(msgs.slice(-50))); } catch {}
};

const ChatInterface = ({ siteId, siteName, supabaseUrl, supabaseKey, embedded = false, welcomeMessage }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Msg[]>(() => getCachedMessages(siteId));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (messages.length > 0) cacheMessages(siteId, messages); }, [messages, siteId]);

  const baseUrl = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const apiKey = supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const allMessages = [...messages, userMsg];
    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(`${baseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ siteId, messages: allMessages, conversationId, visitorId: visitorId.current }),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.reply) upsertAssistant(data.reply);
        if (data.conversationId) setConversationId(data.conversationId);
        setIsLoading(false);
        return;
      }

      const convoId = resp.headers.get("X-Conversation-Id");
      if (convoId) setConversationId(convoId);

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        upsertAssistant(err.error || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      upsertAssistant("Sorry, something went wrong. Please try again.");
    }

    setIsLoading(false);
    inputRef.current?.focus();
  }, [input, isLoading, messages, baseUrl, apiKey, siteId, conversationId]);

  const defaultWelcome = welcomeMessage || "👋 Welcome! What are you looking to buy today?";

  return (
    <div className={embedded ? "flex flex-col h-full bg-card rounded-xl overflow-hidden border" : "flex flex-col h-full"}>
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{siteName || "AI Sales Rep"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            Online
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground px-4">{defaultWelcome}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 sm:gap-3 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2.5 text-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-secondary flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3 animate-slide-up">
            <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-card px-3 sm:px-4 py-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="What are you looking for?" disabled={isLoading} className="flex-1" />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
