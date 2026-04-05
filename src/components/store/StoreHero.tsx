interface StoreHeroProps {
  businessName: string;
  welcomeMessage: string;
  chatEnabled?: boolean;
  onChatClick?: () => void;
  onExploreClick?: () => void;
}

export default function StoreHero({ businessName, welcomeMessage, chatEnabled, onChatClick, onExploreClick }: StoreHeroProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--store-primary), var(--store-secondary))`,
      }}
    >
      {/* Decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-black/10 blur-2xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
          {businessName}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
          {welcomeMessage}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onExploreClick}
            className="px-6 py-3 rounded-xl bg-white text-[var(--store-primary)] font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
          >
            Explore Products
          </button>
          {chatEnabled && (
            <button
              onClick={onChatClick}
              className="px-6 py-3 rounded-xl border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-colors"
            >
              💬 Chat with Sales Rep
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
