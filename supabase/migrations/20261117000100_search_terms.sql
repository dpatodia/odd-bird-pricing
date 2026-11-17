-- Search-term ranks from Amazon Brand Analytics, plus extra competitor detail columns.
alter table public.competitors add column if not exists dims_cm text, add column if not exists size_class text, add column if not exists closure text, add column if not exists pockets int, add column if not exists bsr int;
create table if not exists public.search_terms (week_start date not null, term text not null, market text, rank int not null, brands text, top_title text, click_share numeric, conv_share numeric, primary key (week_start, term));
alter table public.search_terms enable row level security;
drop policy if exists "search_terms read" on public.search_terms;
create policy "search_terms read" on public.search_terms for select to authenticated using (public.is_member());
drop policy if exists "search_terms admin write" on public.search_terms;
create policy "search_terms admin write" on public.search_terms for all to authenticated using (public.is_admin()) with check (public.is_admin());
