create table if not exists public.fire_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('fire_incident', 'hazard_escalation', 'resource_requirement')),
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
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  reviewer_notes text,
  edited_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fire_reports enable row level security;

create index idx_fire_reports_submitted_by on public.fire_reports(submitted_by);
create index idx_fire_reports_status on public.fire_reports(status);
create index idx_fire_reports_type on public.fire_reports(report_type);
create index idx_fire_reports_review_status on public.fire_reports(review_status);

create policy "fire_response_insert_own"
  on public.fire_reports for insert
  to authenticated
  with check (
    (select app_role from public.profiles where id = auth.uid()) = 'fire_response'
    and submitted_by = auth.uid()
  );

create policy "fire_response_read_own"
  on public.fire_reports for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or (select app_role from public.profiles where id = auth.uid()) = 'coordinator'
  );

create policy "fire_response_update_own_active"
  on public.fire_reports for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and status = 'active'
    and (select app_role from public.profiles where id = auth.uid()) = 'fire_response'
  )
  with check (
    submitted_by = auth.uid()
    and (select app_role from public.profiles where id = auth.uid()) = 'fire_response'
  );

create policy "coordinator_update_fire_reports"
  on public.fire_reports for update
  to authenticated
  using ((select app_role from public.profiles where id = auth.uid()) = 'coordinator')
  with check ((select app_role from public.profiles where id = auth.uid()) = 'coordinator');
