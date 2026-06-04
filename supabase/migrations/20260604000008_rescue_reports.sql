create table if not exists public.rescue_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check (report_type in ('rescue_operation', 'casualty_evacuation', 'search_operation', 'resource_requirement')),
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

alter table public.rescue_reports enable row level security;

create index idx_rescue_reports_submitted_by on public.rescue_reports(submitted_by);
create index idx_rescue_reports_status on public.rescue_reports(status);
create index idx_rescue_reports_type on public.rescue_reports(report_type);
create index idx_rescue_reports_review_status on public.rescue_reports(review_status);

create policy "rescue_team_insert_own"
  on public.rescue_reports for insert
  to authenticated
  with check (
    (select app_role from public.profiles where id = auth.uid()) = 'rescue_team'
    and submitted_by = auth.uid()
  );

create policy "rescue_team_read_own"
  on public.rescue_reports for select
  to authenticated
  using (
    submitted_by = auth.uid()
    or (select app_role from public.profiles where id = auth.uid()) = 'coordinator'
  );

create policy "rescue_team_update_own_active"
  on public.rescue_reports for update
  to authenticated
  using (
    submitted_by = auth.uid()
    and status = 'active'
    and (select app_role from public.profiles where id = auth.uid()) = 'rescue_team'
  )
  with check (
    submitted_by = auth.uid()
    and (select app_role from public.profiles where id = auth.uid()) = 'rescue_team'
  );

create policy "coordinator_update_rescue_reports"
  on public.rescue_reports for update
  to authenticated
  using ((select app_role from public.profiles where id = auth.uid()) = 'coordinator')
  with check ((select app_role from public.profiles where id = auth.uid()) = 'coordinator');
