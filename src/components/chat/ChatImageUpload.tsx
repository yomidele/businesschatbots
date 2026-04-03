import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatImageUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const ChatImageUpload = ({ onFileSelected, disabled }: ChatImageUploadProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Please upload a JPG, PNG, GIF, WebP, or PDF file.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("File must be under 5MB.");
      return;
    }

    onFileSelected(file);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        title="Upload image"
      >
        <ImagePlus className="h-4 w-4" />
      </Button>
    </>
  );
};

export default ChatImageUpload;
