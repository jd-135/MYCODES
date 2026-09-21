-- ============================================================
-- QRGen Pro — Supabase schema
-- Run this once in your Supabase project: SQL Editor > New query > paste > Run
-- ============================================================

-- 1. PROFILES (extends auth.users, created automatically on signup)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  plan text not null default 'free',           -- free | starter | growth
  plan_status text not null default 'inactive', -- inactive | pending | active
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. QR CODES
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  campaign text not null default 'Untitled campaign',
  type text not null default 'url',
  content text not null,
  short_slug text not null unique,
  foreground text not null default '#07111f',
  accent text not null default '#1f6fff',
  frame_style text not null default 'standard',
  outer_frame text not null default 'Scan Me tab',
  password text,
  status text not null default 'active', -- active | expired
  created_at timestamptz not null default now()
);

create index if not exists qr_codes_user_id_idx on public.qr_codes (user_id);
create index if not exists qr_codes_slug_idx on public.qr_codes (short_slug);

-- 3. SCANS (analytics events — inserted by the redirect edge function)
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.qr_codes(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  device text,
  country text
);

create index if not exists scans_qr_id_idx on public.scans (qr_id);

-- 4. PAYMENTS (manual UPI verification)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan text not null,             -- starter | growth
  amount numeric not null,
  upi_ref text not null,          -- transaction ID the user submits
  status text not null default 'pending', -- pending | verified | rejected
  submitted_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists payments_user_id_idx on public.payments (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.qr_codes enable row level security;
alter table public.scans   enable row level security;
alter table public.payments enable row level security;

-- profiles: users can read/update only their own row
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- qr_codes: full CRUD, own rows only
create policy "qr_codes_all_own" on public.qr_codes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- scans: users can only SELECT scans belonging to their own QR codes.
-- INSERT is done by the redirect edge function using the service_role key,
-- which bypasses RLS, so no insert policy is needed here.
create policy "scans_select_own" on public.scans for select using (
  exists (
    select 1 from public.qr_codes
    where qr_codes.id = scans.qr_id and qr_codes.user_id = auth.uid()
  )
);

-- payments: users can insert and view their own payment submissions.
-- They CANNOT set status themselves (see check below) — only you,
-- verifying manually in the Supabase Table Editor, can flip it to 'verified'.
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments for insert
  with check (auth.uid() = user_id and status = 'pending');

-- ============================================================
-- Public read-only lookup for the redirect function (anon-safe view)
-- Only exposes what's needed to redirect + password-check; never exposes owner info.
-- ============================================================
create or replace view public.qr_public_lookup as
  select id, content, short_slug, password
  from public.qr_codes
  where status = 'active';
