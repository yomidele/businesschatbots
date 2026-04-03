import { X } from "lucide-react";

interface ChatImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const ChatImageLightbox = ({ src, alt, onClose }: ChatImageLightboxProps) => (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
    <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-gray-300">
      <X className="h-8 w-8" />
    </button>
    <img src={src} alt={alt || "Full size"} className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
  </div>
);

export default ChatImageLightbox;
