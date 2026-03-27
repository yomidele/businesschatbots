
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sites (connected websites)
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'ready', 'error')),
  pages_crawled INT NOT NULL DEFAULT 0,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sites" ON public.sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sites" ON public.sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sites" ON public.sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sites" ON public.sites FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Knowledge chunks (extracted from websites)
CREATE TABLE public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  source_url TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'pricing', 'faq', 'service', 'product', 'policy', 'contact', 'about')),
  content TEXT NOT NULL,
  title TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
-- Allow site owners to manage their chunks
CREATE POLICY "Users can view chunks for own sites" ON public.knowledge_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sites WHERE sites.id = knowledge_chunks.site_id AND sites.user_id = auth.uid()));
CREATE POLICY "Users can insert chunks for own sites" ON public.knowledge_chunks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sites WHERE sites.id = knowledge_chunks.site_id AND sites.user_id = auth.uid()));
CREATE POLICY "Users can delete chunks for own sites" ON public.knowledge_chunks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sites WHERE sites.id = knowledge_chunks.site_id AND sites.user_id = auth.uid()));
-- Allow edge functions (service role) to read chunks for any site (for the chat)
CREATE POLICY "Service role can read all chunks" ON public.knowledge_chunks FOR SELECT
  TO service_role USING (true);
CREATE INDEX idx_knowledge_chunks_search ON public.knowledge_chunks USING GIN(search_vector);
CREATE INDEX idx_knowledge_chunks_site ON public.knowledge_chunks(site_id);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION public.update_knowledge_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', COALESCE(NEW.title, '') || ' ' || NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_knowledge_search BEFORE INSERT OR UPDATE ON public.knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_search_vector();

-- Conversations
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- Site owners can view conversations
CREATE POLICY "Users can view conversations for own sites" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sites WHERE sites.id = conversations.site_id AND sites.user_id = auth.uid()));
-- Anyone can create conversations (visitors)
CREATE POLICY "Anyone can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);
-- Service role full access
CREATE POLICY "Service role full access conversations" ON public.conversations FOR ALL TO service_role USING (true);
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- Site owners can view messages
CREATE POLICY "Users can view messages for own sites" ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.sites s ON s.id = c.site_id
    WHERE c.id = chat_messages.conversation_id AND s.user_id = auth.uid()
  ));
-- Anyone can insert messages (visitors chatting)
CREATE POLICY "Anyone can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (true);
-- Service role full access
CREATE POLICY "Service role full access messages" ON public.chat_messages FOR ALL TO service_role USING (true);

-- Search function for knowledge retrieval
CREATE OR REPLACE FUNCTION public.search_knowledge(p_site_id UUID, p_query TEXT, p_limit INT DEFAULT 5)
RETURNS TABLE(id UUID, content TEXT, title TEXT, category TEXT, source_url TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.title,
    kc.category,
    kc.source_url,
    ts_rank(kc.search_vector, plainto_tsquery('english', p_query)) AS rank
  FROM public.knowledge_chunks kc
  WHERE kc.site_id = p_site_id
    AND kc.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
