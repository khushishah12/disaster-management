-- Drop existing tables from earlier schema version
drop table if exists public.shelters cascade;
drop table if exists public.hospitals cascade;

-- States of India
create table if not exists public.states (
  id serial primary key,
  name text unique not null,
  code text
);

-- Cities of India  
create table if not exists public.cities (
  id serial primary key,
  name text not null,
  state_id int references public.states(id),
  unique(name, state_id)
);

-- Hospitals
create table if not exists public.hospitals (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null,
  state text not null,
  address text,
  phone text,
  latitude double precision,
  longitude double precision,
  total_beds int default 0,
  available_beds int default 0,
  icu_beds int default 0,
  emergency_services boolean default false,
  ambulance_available boolean default false,
  oxygen_available boolean default false,
  last_updated timestamptz default now(),
  source text default 'overpass',
  unique(city, state, name)
);

-- Shelters
create table if not exists public.shelters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null,
  state text not null,
  address text,
  phone text,
  capacity int default 0,
  available_occupancy int default 0,
  facilities text[],
  latitude double precision,
  longitude double precision,
  last_updated timestamptz default now(),
  source text default 'overpass',
  unique(city, state, name)
);

-- Indexes
create index if not exists idx_hospitals_city_state on public.hospitals (city, state);
create index if not exists idx_shelters_city_state on public.shelters (city, state);
create index if not exists idx_cities_state on public.cities (state_id);

-- RLS
alter table public.states enable row level security;
alter table public.cities enable row level security;
alter table public.hospitals enable row level security;
alter table public.shelters enable row level security;

create policy "Anyone can read states" on public.states for select using (true);
create policy "Anyone can read cities" on public.cities for select using (true);
create policy "Anyone can read hospitals" on public.hospitals for select using (true);
create policy "Anyone can read shelters" on public.shelters for select using (true);
create policy "Anyone can insert hospitals" on public.hospitals for insert with check (true);
create policy "Anyone can insert shelters" on public.shelters for insert with check (true);
create policy "Anyone can update hospitals" on public.hospitals for update using (true);
create policy "Anyone can update shelters" on public.shelters for update using (true);
