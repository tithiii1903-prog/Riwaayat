create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  slug text not null unique,
  category text not null check (category in ('Lehenga','Saree','Bridal Wear','Anarkali','Suit','Sharara','Gharara','Dupatta','Other')),
  price numeric(12,2) not null check (price > 0),
  description text not null check (char_length(description) between 10 and 5000),
  fabric text,
  color text,
  work text,
  occasion text,
  size text,
  customization text,
  additional_notes text,
  status text not null default 'available' check (status in ('available','out_of_stock','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  file_url text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image','video')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index if not exists listings_category_idx on listings(category);
create index if not exists listings_status_idx on listings(status);
create index if not exists listings_price_idx on listings(price);
create index if not exists listings_created_at_idx on listings(created_at desc);
create index if not exists listing_media_listing_id_idx on listing_media(listing_id, sort_order);

alter table admins enable row level security;
alter table listings enable row level security;
alter table listing_media enable row level security;

-- Public catalogue reads are performed through the backend using the service role.
-- Do not grant browser-side insert/update/delete access to any of these tables.

-- Storage setup:
-- 1. Create a private bucket named riwaayat-media in Supabase Storage.
-- 2. Allow public reads only through signed/public URLs issued by the backend.
-- 3. Allow create/update/delete only to the backend service role.
-- 4. Store files under listings/{listingId}/images/ and listings/{listingId}/videos/.
