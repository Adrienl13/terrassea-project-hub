
-- Table profils utilisateurs
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  email text not null,
  first_name text,
  last_name text,
  company text,
  siren text,
  phone text,
  country text,
  user_type text not null default 'client'
    check (user_type in ('client', 'partner', 'architect', 'admin'))
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = id);

-- Table demandes de devis
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  product_id uuid references public.products(id),
  product_name text,
  offer_id uuid,
  partner_id uuid,
  partner_name text,
  quantity int,
  fit_status text,
  first_name text not null,
  last_name text,
  email text not null,
  company text,
  siren text,
  message text,
  unit_price numeric,
  total_price numeric,
  status text default 'pending'
);

alter table public.quote_requests enable row level security;

create policy "Anyone can insert quote requests"
  on public.quote_requests for insert with check (true);

create policy "Admins can view all quote requests"
  on public.quote_requests for select using (true);
