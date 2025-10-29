-- SEO core tables: seo_pages, redirects, site_settings

-- seo_pages: one row per public route
create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  route_path text not null unique, -- e.g. '/', '/about'
  title text not null,
  meta_description text,
  canonical_url text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  og_title text,
  og_description text,
  og_image_url text,
  twitter_title text,
  twitter_description text,
  twitter_image_url text,
  json_ld jsonb, -- validated in app
  status text not null default 'draft' check (status in ('draft','published')),
  last_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_seo_pages_status on public.seo_pages(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_seo_pages_updated_at on public.seo_pages;
create trigger trg_seo_pages_updated_at
before update on public.seo_pages
for each row execute function public.set_updated_at();

-- redirects
create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_url text not null,
  http_status int not null default 301 check (http_status in (301,302,308)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_redirects_updated_at on public.redirects;
create trigger trg_redirects_updated_at
before update on public.redirects
for each row execute function public.set_updated_at();

-- site_settings: single row of global settings
create table if not exists public.site_settings (
  id boolean primary key default true, -- enforce single row via fixed pk
  brand_name text,
  preferred_domain text, -- e.g. https://dibiex.com
  default_og_image_url text,
  enforce_www boolean default false,
  trailing_slash boolean default false,
  block_admin_paths boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- Basic RLS setup (adjust roles as needed)
alter table public.seo_pages enable row level security;
alter table public.redirects enable row level security;
alter table public.site_settings enable row level security;

-- Policies: public can read only published seo_pages; no writes
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'seo_pages_read_published'
  ) then
    create policy seo_pages_read_published on public.seo_pages
      for select using (status = 'published');
  end if;
end $$;

-- Allow authenticated (admin) to manage; tighten in production by role
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'seo_pages_crud_authenticated'
  ) then
    create policy seo_pages_crud_authenticated on public.seo_pages
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'redirects_read_public'
  ) then
    create policy redirects_read_public on public.redirects for select using (is_active);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'redirects_crud_authenticated'
  ) then
    create policy redirects_crud_authenticated on public.redirects for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'site_settings_read_public'
  ) then
    create policy site_settings_read_public on public.site_settings for select using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'site_settings_crud_authenticated'
  ) then
    create policy site_settings_crud_authenticated on public.site_settings for all to authenticated using (true) with check (true);
  end if;
end $$;


