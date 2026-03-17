
CREATE TABLE public.user_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON public.user_favourites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
  ON public.user_favourites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON public.user_favourites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
