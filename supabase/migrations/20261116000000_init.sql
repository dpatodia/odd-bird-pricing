-- Odd Bird pricing: schema and access rules. Safe to re-run.
create table if not exists public.admin_emails (email text primary key);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_adm boolean;
begin
  select exists(select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) into is_adm;
  insert into public.profiles (id, role, display_name)
  values (new.id, case when is_adm then 'admin' else 'member' end,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists public.styles (
  id text primary key, name text not null, size text, cost numeric not null, target numeric not null,
  slab text not null check (slab in ('500g','1kg','2kg')), mrp numeric not null, sort int not null default 0
);
create table if not exists public.settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by uuid
);
create table if not exists public.competitors (
  asin text primary key, brand text, product text, segment text, market text not null,
  price numeric, mrp numeric, discount_pct numeric, rating numeric, reviews int, units_badge int, url text, read_on date
);
create table if not exists public.snapshots (
  week_start date not null, market text not null, segment text not null, listings int, with_badge int, units_min int,
  median_price numeric, median_mrp numeric, median_discount_pct numeric, primary key (week_start, segment)
);
create table if not exists public.sales (
  week_start date not null, style text not null references public.styles(id), list_price numeric not null,
  coupon_pct numeric not null default 0, sessions int not null, units int not null, ad_spend numeric not null default 0,
  source text, updated_at timestamptz not null default now(), updated_by uuid default auth.uid(),
  primary key (week_start, style)
);

alter table public.admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.styles enable row level security;
alter table public.settings enable row level security;
alter table public.competitors enable row level security;
alter table public.snapshots enable row level security;
alter table public.sales enable row level security;

do $$ declare t text; begin
  foreach t in array array['profiles','styles','settings','competitors','snapshots','sales'] loop
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (true)', t, t);
  end loop;
  foreach t in array array['styles','settings','competitors','snapshots'] loop
    execute format('drop policy if exists "%s admin write" on public.%I', t, t);
    execute format('create policy "%s admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- Any signed-in teammate may add or correct a weekly sales row; only an admin may delete one.
drop policy if exists "sales insert" on public.sales;
create policy "sales insert" on public.sales for insert to authenticated with check (true);
drop policy if exists "sales update" on public.sales;
create policy "sales update" on public.sales for update to authenticated using (true) with check (true);
drop policy if exists "sales admin delete" on public.sales;
create policy "sales admin delete" on public.sales for delete to authenticated using (public.is_admin());
