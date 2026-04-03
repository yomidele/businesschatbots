import { useState, useEffect } from "react";

interface ChatTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_color: string;
}

const DEFAULT_THEME: ChatTheme = {
  primary_color: "",
  secondary_color: "",
  background_color: "",
  text_color: "",
  button_color: "",
};

export function useChatbotTheme(siteId: string, supabaseUrl?: string, supabaseKey?: string) {
  const [theme, setTheme] = useState<ChatTheme>(DEFAULT_THEME);

  useEffect(() => {
    if (!siteId) return;
    const url = supabaseUrl || "https://eqemgveuvkdyectdzpzy.supabase.co";
    const key = supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA";

    fetch(`${url}/rest/v1/chatbot_themes?site_id=eq.${siteId}&select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data[0]) setTheme(data[0]);
      })
      .catch(() => {});
  }, [siteId, supabaseUrl, supabaseKey]);

  return theme;
}
