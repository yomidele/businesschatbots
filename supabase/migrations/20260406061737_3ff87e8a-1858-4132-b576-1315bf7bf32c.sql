
ALTER TABLE public.sites 
  ADD COLUMN IF NOT EXISTS store_type text NOT NULL DEFAULT 'storefront',
  ADD COLUMN IF NOT EXISTS auth_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS api_config jsonb DEFAULT NULL;
