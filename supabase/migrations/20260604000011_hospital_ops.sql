-- Add hospital capacity/resource columns to city_facilities
alter table public.city_facilities
  add column if not exists total_beds integer,
  add column if not exists available_beds integer,
  add column if not exists icu_beds integer,
  add column if not exists oxygen_available boolean,
  add column if not exists ventilator_available boolean,
  add column if not exists surge_capacity text check (surge_capacity in ('normal', 'elevated', 'critical'));

-- Create hospital_reports table
create table if not exists public.hospital_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('bed_availability', 'resource_shortage', 'patient_intake')),
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

alter table public.hospital_reports enable row level security;

create index idx_hospital_reports_submitted_by on public.hospital_reports(submitted_by);
create index idx_hospital_reports_status on public.hospital_reports(status);
create index idx_hospital_reports_type on public.hospital_reports(report_type);
create index idx_hospital_reports_facility on public.hospital_reports(facility_id);

create policy "hospital_coordinator_insert_own"
  on public.hospital_reports for insert
  to authenticated
  with check (
    (select app_role from public.profiles where id = auth.uid()) = 'hospital_coordinator'
    and submitted_by = auth.uid()
  );

create policy "hospital_coordinator_read_own"
  on public.hospital_reports for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or (select app_role from public.profiles where id = auth.uid()) = 'coordinator'
  );

create policy "hospital_coordinator_update_own_active"
  on public.hospital_reports for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and status = 'active'
    and (select app_role from public.profiles where id = auth.uid()) = 'hospital_coordinator'
  )
  with check (
    submitted_by = auth.uid()
    and (select app_role from public.profiles where id = auth.uid()) = 'hospital_coordinator'
  );

create policy "coordinator_update_hospital_reports"
  on public.hospital_reports for update
  to authenticated
  using ((select app_role from public.profiles where id = auth.uid()) = 'coordinator')
  with check ((select app_role from public.profiles where id = auth.uid()) = 'coordinator');
