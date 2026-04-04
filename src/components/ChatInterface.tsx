// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Users, Loader2 } from "lucide-react";
import { sanitizeChatMessage, detectPromptInjection, checkRateLimit } from "@/lib/security";
import { logSecurityEvent } from "@/lib/security-logger";
import { useChatbotTheme } from "@/hooks/useChatbotTheme";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import ChatImageUpload from "@/components/chat/ChatImageUpload";
import { supabase } from "@/lib/supabase-external";

type Msg = { role: "user" | "assistant"; content: string; image_url?: string };

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

const TypingIndicator = () => (
  <div className="flex gap-2 sm:gap-3 animate-slide-up">
    <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
      <Users className="h-3.5 w-3.5 text-primary-foreground" />
    </div>
    <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-1">AI is thinking</span>
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  </div>
);

const ChatInterface = ({ siteId, siteName, supabaseUrl, supabaseKey, embedded = false, welcomeMessage }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Msg[]>(() => getCachedMessages(siteId));
  const theme = useChatbotTheme(siteId, supabaseUrl, supabaseKey);
  const hasTheme = !!(theme.primary_color || theme.background_color);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorId = useRef(getVisitorId());

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (messages.length > 0) cacheMessages(siteId, messages); }, [messages, siteId]);

  const baseUrl = supabaseUrl || 'https://eqemgveuvkdyectdzpzy.supabase.co';
  const apiKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA';

  const handleImageUpload = useCallback(async (file: File) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const ext = file.name.split(".").pop();
    const path = `chat-uploads/${siteId}/${visitorId.current}/${timestamp}_${random}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const userMsg: Msg = { role: "user", content: "📷 Image uploaded", image_url: imageUrl };
    setMessages((prev) => [...prev, userMsg]);

    setIsLoading(true);
    try {
      const imageContextMsg = `User uploaded an image: ${imageUrl}`;
      const allMessages = [...messages, { role: "user" as const, content: imageContextMsg }];

      const resp = await fetch(`${baseUrl}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ siteId, messages: allMessages, conversationId, visitorId: visitorId.current }),
      });

      const data = await resp.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
      if (data.conversationId) setConversationId(data.conversationId);
    } catch (e) {
      console.error("Image context error:", e);
    }
    setIsLoading(false);
  }, [siteId, messages, baseUrl, apiKey, conversationId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    if (!checkRateLimit(`chat_${siteId}`, 30, 60_000)) {
      logSecurityEvent("rate_limited", { siteId });
      setMessages((prev) => [...prev, { role: "assistant", content: "You're sending messages too quickly. Please wait a moment. ⏳" }]);
      return;
    }

    if (detectPromptInjection(input)) {
      logSecurityEvent("prompt_injection_detected", { siteId, snippet: input.slice(0, 80) });
    }

    const sanitized = sanitizeChatMessage(input.trim());
    const userMsg: Msg = { role: "user", content: sanitized };
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

  const themeStyles = hasTheme ? {
    '--chat-primary': theme.primary_color,
    '--chat-secondary': theme.secondary_color,
    '--chat-bg': theme.background_color,
    '--chat-text': theme.text_color,
    '--chat-button': theme.button_color,
  } as React.CSSProperties : {};

  return (
    <div className={embedded ? "flex flex-col h-full rounded-xl overflow-hidden border" : "flex flex-col h-full"} style={{ ...themeStyles, backgroundColor: hasTheme ? theme.background_color : undefined, color: hasTheme ? theme.text_color : undefined }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0" style={hasTheme ? { backgroundColor: theme.primary_color, color: "#fff" } : undefined}>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${hasTheme ? "" : "bg-primary"}`} style={hasTheme ? { backgroundColor: theme.secondary_color } : undefined}>
          <Users className={`h-4 w-4 ${hasTheme ? "" : "text-primary-foreground"}`} style={hasTheme ? { color: theme.text_color } : undefined} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{siteName || "AI Sales Rep"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 sm:py-12 animate-fade-in">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground px-4">{defaultWelcome}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} msg={msg} hasTheme={hasTheme} theme={theme} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <TypingIndicator />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-card px-3 sm:px-4 py-3 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-center">
          <ChatImageUpload onFileSelected={handleImageUpload} disabled={isLoading} />
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="What are you looking for?" disabled={isLoading} className="flex-1" />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} style={hasTheme ? { backgroundColor: theme.button_color } : undefined}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
