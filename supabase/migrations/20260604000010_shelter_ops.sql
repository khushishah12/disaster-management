-- Add capacity/status columns to city_facilities for shelter management
alter table public.city_facilities
  add column if not exists current_occupancy integer,
  add column if not exists max_capacity integer,
  add column if not exists food_status text check (food_status in ('adequate', 'limited', 'depleted')),
  add column if not exists water_status text check (water_status in ('adequate', 'limited', 'depleted')),
  add column if not exists sanitation_status text check (sanitation_status in ('functional', 'limited', 'non_functional')),
  add column if not exists accepting_evacuees boolean default false;

-- Create shelter_reports table
create table if not exists public.shelter_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('capacity_update', 'facility_availability', 'occupancy_report', 'evacuee_acceptance')),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  submitted_by uuid not null references auth.users(id),
  facility_id uuid references public.city_facilities(id) on delete set null,
  title text not null,
  description text,
  location text not null,
  state text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shelter_reports enable row level security;

create index idx_shelter_reports_submitted_by on public.shelter_reports(submitted_by);
create index idx_shelter_reports_status on public.shelter_reports(status);
create index idx_shelter_reports_type on public.shelter_reports(report_type);
create index idx_shelter_reports_facility on public.shelter_reports(facility_id);

create policy "shelter_department_insert_own"
  on public.shelter_reports for insert
  to authenticated
  with check (
    (select app_role from public.profiles where id = auth.uid()) = 'shelter_department'
    and submitted_by = auth.uid()
  );

create policy "shelter_department_read_own"
  on public.shelter_reports for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or (select app_role from public.profiles where id = auth.uid()) = 'coordinator'
  );

create policy "shelter_department_update_own_active"
  on public.shelter_reports for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and status = 'active'
    and (select app_role from public.profiles where id = auth.uid()) = 'shelter_department'
  )
  with check (
    submitted_by = auth.uid()
    and (select app_role from public.profiles where id = auth.uid()) = 'shelter_department'
  );

create policy "coordinator_update_shelter_reports"
  on public.shelter_reports for update
  to authenticated
  using ((select app_role from public.profiles where id = auth.uid()) = 'coordinator')
  with check ((select app_role from public.profiles where id = auth.uid()) = 'coordinator');
