create table if not exists public.ambulance_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('emergency_incident', 'patient_transfer', 'road_blockage', 'hospital_dropoff', 'availability')),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  submitted_by uuid not null references auth.users(id),
  title text not null,
  description text,
  location text not null,
  state text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  data jsonb not null default '{}',
  media_urls text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ambulance_reports enable row level security;

create index idx_ambulance_reports_submitted_by on public.ambulance_reports(submitted_by);
create index idx_ambulance_reports_status on public.ambulance_reports(status);
create index idx_ambulance_reports_type on public.ambulance_reports(report_type);

-- ambulance_team can insert their own reports
create policy "ambulance_team_insert_own"
  on public.ambulance_reports for insert
  to authenticated
  with check (
    (select app_role from public.profiles where id = auth.uid()) = 'ambulance_team'
    and submitted_by = auth.uid()
  );

-- ambulance_team can read their own reports; coordinators can read all
create policy "ambulance_team_read_own"
  on public.ambulance_reports for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or (select app_role from public.profiles where id = auth.uid()) = 'coordinator'
  );

-- ambulance_team can update their own active reports (cannot change submitted_by)
create policy "ambulance_team_update_own_active"
  on public.ambulance_reports for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and status = 'active'
    and (select app_role from public.profiles where id = auth.uid()) = 'ambulance_team'
  )
  with check (
    submitted_by = auth.uid()
    and (select app_role from public.profiles where id = auth.uid()) = 'ambulance_team'
  );

-- coordinators can update any report (to complete/cancel)
create policy "coordinator_update_any"
  on public.ambulance_reports for update
  to authenticated
  using ((select app_role from public.profiles where id = auth.uid()) = 'coordinator')
  with check ((select app_role from public.profiles where id = auth.uid()) = 'coordinator');
