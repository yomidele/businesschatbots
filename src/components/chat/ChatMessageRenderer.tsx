import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatImageLightbox from "./ChatImageLightbox";

export type StructuredMessage =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "product"; name: string; price?: string; image?: string; description?: string; actionLabel?: string; actionUrl?: string }
  | { type: "carousel"; items: { name: string; price?: string; image?: string; description?: string; actionLabel?: string; actionUrl?: string }[] };

const IMAGE_URL_REGEX = /(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s)]*)?)/gi;

/** Try to parse structured JSON blocks from AI response */
export function parseStructuredMessages(raw: string): StructuredMessage[] {
  // Try parsing entire response as JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type) return [parsed as StructuredMessage];
    if (Array.isArray(parsed)) return parsed.filter((m: any) => m.type) as StructuredMessage[];
  } catch {}

  // Try extracting JSON blocks from markdown
  const jsonBlocks: StructuredMessage[] = [];
  const jsonRegex = /```json\s*([\s\S]*?)```/g;
  let remaining = raw;
  let match;

  while ((match = jsonRegex.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.type) jsonBlocks.push(parsed);
      remaining = remaining.replace(match[0], "");
    } catch {}
  }

  if (jsonBlocks.length > 0) {
    const trimmed = remaining.trim();
    if (trimmed) return [{ type: "text", content: trimmed }, ...jsonBlocks];
    return jsonBlocks;
  }

  // Fallback: detect image URLs inline and render as mixed content
  return [{ type: "text", content: raw }];
}

function ProductCard({ name, price, image, description, actionLabel, actionUrl }: {
  name: string; price?: string; image?: string; description?: string; actionLabel?: string; actionUrl?: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden max-w-[280px]">
      {image && (
        <img
          src={image}
          alt={name}
          className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightbox(image)}
          loading="lazy"
        />
      )}
      <div className="p-3 space-y-1.5">
        <h4 className="font-semibold text-sm text-foreground">{name}</h4>
        {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
        {price && <p className="text-sm font-bold text-green-600">{price}</p>}
        {actionUrl && (
          <a
            href={actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-center text-xs font-medium py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {actionLabel || "View"}
          </a>
        )}
      </div>
      {lightbox && <ChatImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

interface ChatMessageRendererProps {
  content: string;
  isAssistant: boolean;
}

export default function ChatMessageRenderer({ content, isAssistant }: ChatMessageRendererProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!isAssistant) {
    return <span className="text-sm whitespace-pre-wrap">{content}</span>;
  }

  const messages = parseStructuredMessages(content);

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => {
        switch (msg.type) {
          case "text":
            return (
              <div key={i} className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ src, alt }) => (
                      <img
                        src={src}
                        alt={alt || "Image"}
                        className="max-w-[220px] rounded-lg mt-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => src && setLightboxSrc(src)}
                        loading="lazy"
                      />
                    ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                {/* Detect and render inline image URLs not caught by markdown */}
                <InlineImageRenderer text={msg.content} onImageClick={setLightboxSrc} />
              </div>
            );
          case "image":
            return (
              <div key={i} className="space-y-1">
                <img
                  src={msg.url}
                  alt={msg.caption || "Image"}
                  className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxSrc(msg.url)}
                  loading="lazy"
                />
                {msg.caption && <p className="text-xs text-muted-foreground">{msg.caption}</p>}
              </div>
            );
          case "product":
            return <ProductCard key={i} {...msg} />;
          case "carousel":
            return (
              <div key={i} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {msg.items.map((item, j) => (
                  <div key={j} className="flex-shrink-0">
                    <ProductCard {...item} />
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
      {lightboxSrc && <ChatImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

function InlineImageRenderer({ text, onImageClick }: { text: string; onImageClick: (src: string) => void }) {
  // Only render images that aren't already in markdown image syntax
  const markdownImageRegex = /!\[.*?\]\(.*?\)/g;
  const cleanedText = text.replace(markdownImageRegex, "");

  const matches = cleanedText.match(IMAGE_URL_REGEX);
  if (!matches || matches.length === 0) return null;

  // Deduplicate
  const unique = [...new Set(matches)];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {unique.map((url, i) => (
        <img
          key={i}
          src={url}
          alt="Product"
          className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(url)}
          loading="lazy"
        />
      ))}
    </div>
  );
}
