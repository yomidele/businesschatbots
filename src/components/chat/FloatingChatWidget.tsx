import { useState, useEffect } from "react";
import { MessageCircle, X, Maximize2, Minimize2 } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";

interface FloatingChatWidgetProps {
  siteId: string;
  siteName?: string;
  welcomeMessage?: string;
}

const FloatingChatWidget = ({ siteId, siteName, welcomeMessage }: FloatingChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unread, setUnread] = useState(1);

  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold animate-bounce">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-in-out ${
            isFullscreen
              ? "inset-0"
              : "bottom-5 right-5 w-[min(400px,calc(100vw-40px))] h-[min(600px,calc(100vh-40px))] rounded-2xl shadow-2xl"
          }`}
        >
          <div className={`relative h-full w-full bg-card flex flex-col overflow-hidden ${
            isFullscreen ? "" : "rounded-2xl border border-border"
          }`}>
            {/* Custom header with controls */}
            <div className="absolute top-0 right-0 z-10 flex items-center gap-1 p-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                aria-label={isFullscreen ? "Minimize" : "Maximize"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsFullscreen(false); }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ChatInterface
              siteId={siteId}
              siteName={siteName}
              embedded
              welcomeMessage={welcomeMessage}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatWidget;
