// @ts-nocheck
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Users, User } from "lucide-react";
import ChatImageLightbox from "./ChatImageLightbox";

type Msg = { role: "user" | "assistant"; content: string; image_url?: string };

// Detect image URLs in text and render them inline
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)/gi;

const InlineImages = ({ text }: { text: string }) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const parts = text.split(IMAGE_URL_REGEX);

  return (
    <>
      {parts.map((part, i) => {
        if (IMAGE_URL_REGEX.test(part)) {
          IMAGE_URL_REGEX.lastIndex = 0; // reset regex
          return (
            <img
              key={i}
              src={part}
              alt="Product"
              className="max-w-[200px] rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxSrc(part)}
              loading="lazy"
            />
          );
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
      {lightboxSrc && <ChatImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
};

interface ChatMessageBubbleProps {
  msg: Msg;
  hasTheme: boolean;
  theme: Record<string, string>;
}

const ChatMessageBubble = ({ msg, hasTheme, theme }: ChatMessageBubbleProps) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Check if content has image URLs
  const hasImageUrls = msg.content && IMAGE_URL_REGEX.test(msg.content);
  IMAGE_URL_REGEX.lastIndex = 0;

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
        {/* Render uploaded image */}
        {msg.image_url && (
          <img
            src={msg.image_url}
            alt="Uploaded"
            className="max-w-[200px] rounded-lg mb-2 cursor-pointer hover:opacity-90"
            onClick={() => setLightboxSrc(msg.image_url!)}
            loading="lazy"
          />
        )}

        {msg.role === "assistant" ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {hasImageUrls ? (
              <div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ src, alt }) => (
                      <img
                        src={src}
                        alt={alt || "Image"}
                        className="max-w-[200px] rounded-lg mt-2 cursor-pointer hover:opacity-90"
                        onClick={() => src && setLightboxSrc(src)}
                        loading="lazy"
                      />
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                <InlineImages text={msg.content} />
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            )}
          </div>
        ) : msg.content}
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
