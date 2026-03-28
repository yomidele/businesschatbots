ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'openai';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS ai_model text NOT NULL DEFAULT 'gpt-4o-mini';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Hi there! 👋 How can I help you today?';