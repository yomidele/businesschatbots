
-- Webhook events table for idempotent payment processing
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access webhook_events" ON public.webhook_events FOR ALL TO service_role USING (true);
CREATE POLICY "Users can view own webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sites WHERE sites.id = webhook_events.site_id AND sites.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON public.webhook_events(order_id);

-- Add customer_address to orders if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
