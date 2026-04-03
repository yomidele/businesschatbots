// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_color: string;
}

const DEFAULT_THEME: ThemeSettings = {
  primary_color: "#6366f1",
  secondary_color: "#f1f5f9",
  background_color: "#ffffff",
  text_color: "#1e293b",
  button_color: "#6366f1",
};

interface Props {
  siteId: string;
  onClose?: () => void;
}

const ChatbotThemeSettings = ({ siteId, onClose }: Props) => {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTheme();
  }, [siteId]);

  const loadTheme = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chatbot_themes")
      .select("*")
      .eq("site_id", siteId)
      .single();
    if (data) {
      setTheme({
        primary_color: data.primary_color || DEFAULT_THEME.primary_color,
        secondary_color: data.secondary_color || DEFAULT_THEME.secondary_color,
        background_color: data.background_color || DEFAULT_THEME.background_color,
        text_color: data.text_color || DEFAULT_THEME.text_color,
        button_color: data.button_color || DEFAULT_THEME.button_color,
      });
    }
    setLoading(false);
  };

  const saveTheme = async () => {
    setSaving(true);
    // Upsert: try update first, then insert
    const { data: existing } = await supabase
      .from("chatbot_themes")
      .select("id")
      .eq("site_id", siteId)
      .single();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("chatbot_themes")
        .update({ ...theme })
        .eq("site_id", siteId));
    } else {
      ({ error } = await supabase
        .from("chatbot_themes")
        .insert({ site_id: siteId, ...theme }));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save theme: " + error.message);
    } else {
      toast.success("Chatbot theme saved!");
      onClose?.();
    }
  };

  const colorFields: { key: keyof ThemeSettings; label: string }[] = [
    { key: "primary_color", label: "Primary Color" },
    { key: "secondary_color", label: "Secondary Color" },
    { key: "background_color", label: "Background Color" },
    { key: "text_color", label: "Text Color" },
    { key: "button_color", label: "Button Color" },
  ];

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {colorFields.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={theme[key]}
                onChange={(e) => setTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                className="h-9 w-10 rounded border cursor-pointer"
              />
              <Input
                value={theme[key]}
                onChange={(e) => setTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="rounded-lg border p-3" style={{ backgroundColor: theme.background_color }}>
        <p className="text-xs font-medium mb-2" style={{ color: theme.text_color }}>Preview</p>
        <div className="flex gap-2 items-end">
          <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: theme.secondary_color, color: theme.text_color }}>
            Hello! How can I help?
          </div>
        </div>
        <div className="flex gap-2 items-end justify-end mt-2">
          <div className="rounded-lg px-3 py-2 text-xs text-white" style={{ backgroundColor: theme.primary_color }}>
            I want to buy something
          </div>
        </div>
        <div className="mt-3">
          <button className="rounded-lg px-4 py-1.5 text-xs text-white" style={{ backgroundColor: theme.button_color }}>
            Send
          </button>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onClose && <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>}
        <Button size="sm" onClick={saveTheme} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Palette className="h-4 w-4 mr-1" />}
          Save Theme
        </Button>
      </div>
    </div>
  );
};

export default ChatbotThemeSettings;
