/*
  Migration: create rescue_team_members table
*/
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

create table if not exists public.rescue_team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  phone text,
  assigned_disaster_id uuid references public.disasters(id),
  task_status text default 'pending' check (task_status in ('pending','completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast lookup
create index if not exists idx_rescue_team_members_disaster on public.rescue_team_members (assigned_disaster_id);
create index if not exists idx_rescue_team_members_status on public.rescue_team_members (task_status);
