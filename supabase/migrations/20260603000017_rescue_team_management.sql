-- Rescue team management for disaster coordinators

-- ------------------------------------------------------------
-- Disaster catalogue used for member assignments
-- ------------------------------------------------------------
create table if not exists public.disasters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  disaster_type text not null,
  location text not null,
  severity text not null default 'moderate' check (severity in ('low', 'moderate', 'high', 'critical')),
  response_status text not null default 'active' check (response_status in ('active', 'monitoring', 'resolved')),
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_disasters_severity on public.disasters (severity);
create index if not exists idx_disasters_response_status on public.disasters (response_status);
create index if not exists idx_disasters_reported_at on public.disasters (reported_at desc);

alter table public.disasters enable row level security;

create or replace function public.is_disaster_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'coordinator'
  );
$$;

create policy "Responders can view disasters"
  on public.disasters
  for select
  to authenticated
  using (public.is_responder());

create policy "Coordinators can manage disasters"
  on public.disasters
  for insert
  to authenticated
  with check (public.is_disaster_coordinator());

create policy "Coordinators can update disasters"
  on public.disasters
  for update
  to authenticated
  using (public.is_disaster_coordinator())
  with check (public.is_disaster_coordinator());

create policy "Coordinators can delete disasters"
  on public.disasters
  for delete
  to authenticated
  using (public.is_disaster_coordinator());

create trigger disasters_set_updated_at
  before update on public.disasters
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Rescue team members
-- ------------------------------------------------------------
alter table public.rescue_team_members
  add column if not exists email text;

alter table public.rescue_team_members
  add column if not exists base_location text;

alter table public.rescue_team_members
  add column if not exists skills text[] not null default '{}'::text[];

alter table public.rescue_team_members
  add column if not exists notes text;

alter table public.rescue_team_members
  add column if not exists priority integer not null default 2;

alter table public.rescue_team_members
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'rescue_team_members_task_status_check'
      and conrelid = 'public.rescue_team_members'::regclass
  ) then
    alter table public.rescue_team_members
      drop constraint rescue_team_members_task_status_check;
  end if;
end
$$;

alter table public.rescue_team_members
  add constraint rescue_team_members_task_status_check
  check (task_status in ('pending', 'assigned', 'in_progress', 'completed'));

alter table public.rescue_team_members
  add constraint rescue_team_members_priority_check
  check (priority between 1 and 3);

update public.rescue_team_members
set completed_at = case
  when task_status = 'completed' and completed_at is null then updated_at
  else completed_at
end;

create index if not exists idx_rescue_team_members_name on public.rescue_team_members (lower(name));
create index if not exists idx_rescue_team_members_role on public.rescue_team_members (lower(role));
create index if not exists idx_rescue_team_members_disaster on public.rescue_team_members (assigned_disaster_id);
create index if not exists idx_rescue_team_members_status on public.rescue_team_members (task_status);
create index if not exists idx_rescue_team_members_updated_at on public.rescue_team_members (updated_at desc);

alter table public.rescue_team_members enable row level security;

create policy "Responders can view rescue team members"
  on public.rescue_team_members
  for select
  to authenticated
  using (public.is_responder());

create policy "Coordinators can manage rescue team members"
  on public.rescue_team_members
  for insert
  to authenticated
  with check (public.is_disaster_coordinator());

create policy "Coordinators can update rescue team members"
  on public.rescue_team_members
  for update
  to authenticated
  using (public.is_disaster_coordinator())
  with check (public.is_disaster_coordinator());

create policy "Coordinators can delete rescue team members"
  on public.rescue_team_members
  for delete
  to authenticated
  using (public.is_disaster_coordinator());

create trigger rescue_team_members_set_updated_at
  before update on public.rescue_team_members
  for each row
  execute function public.set_updated_at();
