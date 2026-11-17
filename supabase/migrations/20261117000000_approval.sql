-- Approval gate: a login sees nothing until an admin approves it. Safe to re-run.
alter table public.profiles add column if not exists approved boolean not null default false;
update public.profiles set approved = true where role = 'admin';

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and approved);
$$;

do $$ declare t text; begin
  foreach t in array array['styles','settings','competitors','snapshots','sales'] loop
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (public.is_member())', t, t);
  end loop;
end $$;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sales insert" on public.sales;
create policy "sales insert" on public.sales for insert to authenticated with check (public.is_member());
drop policy if exists "sales update" on public.sales;
create policy "sales update" on public.sales for update to authenticated using (public.is_member()) with check (public.is_member());
select (select count(*) from public.profiles where approved) as approved_logins, (select count(*) from pg_policies where schemaname = 'public') as policies;
