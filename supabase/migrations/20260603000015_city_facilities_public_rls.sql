-- Allow anon inserts for city_facilities (public data, no auth needed for seeding)
drop policy if exists "Authenticated users can insert city_facilities" on public.city_facilities;
drop policy if exists "Authenticated users can update city_facilities" on public.city_facilities;

create policy "Anyone can insert city_facilities"
  on public.city_facilities for insert
  with check (true);

create policy "Anyone can update city_facilities"
  on public.city_facilities for update
  using (true);
