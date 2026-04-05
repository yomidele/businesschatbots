interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
  image_url?: string | null;
  category?: string | null;
  stock?: number | null;
  isFeatured?: boolean;
}

interface ProductGridProps {
  products: Product[];
  currency: string;
  currencySymbol: string;
  layout: "grid" | "list" | "carousel";
  onBuy?: (product: Product) => void;
}

function ProductCard({ product, currencySymbol, onBuy, variant = "grid" }: { product: Product; currencySymbol: string; onBuy?: (p: Product) => void; variant?: "grid" | "list" }) {
  const isList = variant === "list";

  return (
    <div
      className={`group bg-[var(--store-card)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
        isList ? "flex flex-row gap-4" : "flex flex-col"
      } ${product.isFeatured ? "ring-2 ring-[var(--store-accent)] relative" : ""}`}
    >
      {product.isFeatured && (
        <span className="absolute top-3 left-3 z-10 bg-[var(--store-accent)] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          Featured
        </span>
      )}
      {product.image_url ? (
        <div className={`${isList ? "w-32 h-32 shrink-0" : "w-full aspect-square"} overflow-hidden bg-gray-100`}>
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className={`${isList ? "w-32 h-32 shrink-0" : "w-full aspect-square"} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
          <span className="text-4xl opacity-30">📦</span>
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col gap-2">
        {product.category && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--store-secondary)] opacity-70">
            {product.category}
          </span>
        )}
        <h3 className="font-bold text-[var(--store-text)] leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-[var(--store-text)] opacity-60 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div>
            {product.price != null && (
              <span className="text-lg font-extrabold text-[var(--store-primary)]">
                {currencySymbol}{product.price.toLocaleString()}
              </span>
            )}
            {product.stock != null && (
              <span className={`ml-2 text-xs ${product.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            )}
          </div>
          {onBuy && product.price != null && (product.stock === null || product.stock > 0) && (
            <button
              onClick={() => onBuy(product)}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--store-primary)] text-white hover:opacity-90 transition-opacity shrink-0"
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ products, currencySymbol, layout, onBuy }: ProductGridProps) {
  const featured = products.filter(p => p.isFeatured);
  const regular = products.filter(p => !p.isFeatured);
  const sorted = [...featured, ...regular];

  if (layout === "carousel") {
    return (
      <div className="space-y-6">
        {featured.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--store-secondary)] mb-3">⭐ Featured</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
              {featured.map(p => (
                <div key={p.id} className="w-72 shrink-0 snap-start">
                  <ProductCard product={p} currencySymbol={currencySymbol} onBuy={onBuy} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {regular.map(p => (
            <div key={p.id} className="w-72 shrink-0 snap-start">
              <ProductCard product={p} currencySymbol={currencySymbol} onBuy={onBuy} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="space-y-3">
        {sorted.map(p => (
          <ProductCard key={p.id} product={p} currencySymbol={currencySymbol} onBuy={onBuy} variant="list" />
        ))}
      </div>
    );
  }

  // Grid (default)
  return (
    <div className="space-y-8">
      {featured.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--store-secondary)] mb-4">⭐ Featured Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map(p => (
              <ProductCard key={p.id} product={p} currencySymbol={currencySymbol} onBuy={onBuy} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {regular.map(p => (
          <ProductCard key={p.id} product={p} currencySymbol={currencySymbol} onBuy={onBuy} />
        ))}
      </div>
    </div>
  );
}
