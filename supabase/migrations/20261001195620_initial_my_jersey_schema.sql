-- My Jersey initial schema.
-- Intentionally contains no seed products, reviews, customers, or fabricated data.

create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  base_price bigint check (base_price is null or base_price >= 0),
  currency text not null default 'BDT'
    check (currency ~ '^[A-Z]{3}$'),
  image_url text,
  stock_status text not null default 'made_to_order'
    check (stock_status in ('made_to_order', 'in_stock', 'out_of_stock')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text,
  sport text not null,
  quantity integer not null check (quantity > 0),
  preferred_colors text,
  reference_url text,
  asset_path text,
  details text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.team_orders (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  organization text not null,
  email text not null,
  phone text,
  quantity integer not null check (quantity > 0),
  target_date date,
  details text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index products_active_category_idx
  on public.products(active, category);

create index custom_requests_created_at_idx
  on public.custom_requests(created_at desc);

create index team_orders_created_at_idx
  on public.team_orders(created_at desc);

create index contact_messages_created_at_idx
  on public.contact_messages(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- All application data flows through the server API at this stage. Browser
-- roles receive no direct table access. The server-side Supabase secret key
-- operates as service_role and must never be exposed in public code.
alter table public.products enable row level security;
alter table public.custom_requests enable row level security;
alter table public.team_orders enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_users enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.custom_requests from anon, authenticated;
revoke all on table public.team_orders from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

grant all on table public.products to service_role;
grant all on table public.custom_requests to service_role;
grant all on table public.team_orders to service_role;
grant all on table public.contact_messages to service_role;
grant all on table public.admin_users to service_role;
