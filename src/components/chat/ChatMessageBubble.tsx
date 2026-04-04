import { useState } from "react";
import { Users, User } from "lucide-react";
import ChatImageLightbox from "./ChatImageLightbox";
import ChatMessageRenderer from "./ChatMessageRenderer";

type Msg = { role: "user" | "assistant"; content: string; image_url?: string };

interface ChatMessageBubbleProps {
  msg: Msg;
  hasTheme: boolean;
  theme: Record<string, string>;
}

const ChatMessageBubble = ({ msg, hasTheme, theme }: ChatMessageBubbleProps) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <div className={`flex gap-2 sm:gap-3 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}>
      {msg.role === "assistant" && (
        <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <Users className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3 sm:px-4 py-2.5 text-sm ${
          !hasTheme ? (msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted") : ""
        }`}
        style={hasTheme ? {
          backgroundColor: msg.role === "user" ? theme.primary_color : theme.secondary_color,
          color: msg.role === "user" ? "#fff" : theme.text_color,
        } : undefined}
      >
        {msg.image_url && (
          <img
            src={msg.image_url}
            alt="Uploaded"
            className="max-w-[200px] rounded-lg mb-2 cursor-pointer hover:opacity-90"
            onClick={() => setLightboxSrc(msg.image_url!)}
            loading="lazy"
          />
        )}

        <ChatMessageRenderer content={msg.content} isAssistant={msg.role === "assistant"} />
      </div>
      {msg.role === "user" && (
        <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-secondary flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-secondary-foreground" />
        </div>
      )}
      {lightboxSrc && <ChatImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
};

export default ChatMessageBubble;
