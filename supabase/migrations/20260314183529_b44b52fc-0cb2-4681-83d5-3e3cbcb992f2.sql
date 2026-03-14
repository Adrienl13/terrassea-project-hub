
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS table_shape text,
  ADD COLUMN IF NOT EXISTS default_seating_capacity integer,
  ADD COLUMN IF NOT EXISTS recommended_seating_min integer,
  ADD COLUMN IF NOT EXISTS recommended_seating_max integer,
  ADD COLUMN IF NOT EXISTS combinable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS combined_capacity_if_joined integer;
