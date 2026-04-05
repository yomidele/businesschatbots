import { Grid3X3, List, GalleryHorizontalEnd } from "lucide-react";

type Layout = "grid" | "list" | "carousel";

interface LayoutSwitcherProps {
  layout: Layout;
  onChange: (l: Layout) => void;
}

const options: { value: Layout; icon: typeof Grid3X3; label: string }[] = [
  { value: "grid", icon: Grid3X3, label: "Grid" },
  { value: "list", icon: List, label: "List" },
  { value: "carousel", icon: GalleryHorizontalEnd, label: "Carousel" },
];

export default function LayoutSwitcher({ layout, onChange }: LayoutSwitcherProps) {
  return (
    <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            layout === opt.value
              ? "bg-[var(--store-primary)] text-white shadow-sm"
              : "text-[var(--store-text)] opacity-60 hover:opacity-100"
          }`}
          title={opt.label}
        >
          <opt.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
