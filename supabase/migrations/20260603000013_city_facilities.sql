-- City facilities cache table
-- Stores hospitals, police stations, fire stations, and shelters per city
-- Populated on-demand from Overpass API, then served from DB for speed

create table if not exists public.city_facilities (
  id uuid default gen_random_uuid() primary key,
  city text not null,
  state text not null,
  name text not null,
  type text not null check (type in ('hospital', 'police', 'fire_station', 'shelter')),
  phone text,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  operator text,
  distance_km double precision,
  source text default 'overpass',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_city_facilities_city_state
  on public.city_facilities (city, state);

create index if not exists idx_city_facilities_type
  on public.city_facilities (type);

-- Enable RLS but allow all authenticated users to read
alter table public.city_facilities enable row level security;

create policy "Anyone can read city_facilities"
  on public.city_facilities for select
  using (true);

create policy "Authenticated users can insert city_facilities"
  on public.city_facilities for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update city_facilities"
  on public.city_facilities for update
  using (auth.role() = 'authenticated');
