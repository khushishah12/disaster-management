-- Contributions: user-submitted data pending coordinator review
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  contribution_type text not null check (contribution_type in ('hospital', 'shelter', 'incident')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),

  -- Submitter info
  submitted_by uuid references auth.users(id),
  submitter_name text,
  submitter_contact text,

  -- Core data (varies by type, stored as JSON for flexibility)
  title text not null,
  description text,
  location text not null,
  state text not null,
  city text not null,
  latitude double precision,
  longitude double precision,
  data jsonb not null default '{}',

  -- Media evidence
  media_urls text[] default '{}',

  -- Confidence / duplicate detection
  confidence_score real default 0.5,
  duplicate_of uuid references public.contributions(id),
  duplicate_warning text,

  -- Verification
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  rejection_reason text,
  reviewer_notes text,
  edited_data jsonb,

  -- Audit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contributions_status on public.contributions (status);
create index if not exists idx_contributions_type on public.contributions (contribution_type);
create index if not exists idx_contributions_submitted on public.contributions (submitted_by);
create index if not exists idx_contributions_created on public.contributions (created_at desc);

-- RLS
alter table public.contributions enable row level security;

create policy "Anyone can insert contributions"
  on public.contributions for insert
  to authenticated
  with check (true);

create policy "Coordinators can read all contributions"
  on public.contributions for select
  to authenticated
  using (public.is_disaster_coordinator() or auth.uid() = submitted_by);

create policy "Coordinators can update contributions"
  on public.contributions for update
  to authenticated
  using (public.is_disaster_coordinator());

-- Seed sample pending contributions for testing
insert into public.contributions (contribution_type, status, title, description, location, state, city, latitude, longitude, data, confidence_score, submitter_name, media_urls) values
  ('hospital', 'pending', 'Apollo Hospital - New Wing', 'Newly constructed emergency wing with 50 beds and ICU facilities.', 'Mumbai, Maharashtra', 'Maharashtra', 'Mumbai', 19.0760, 72.8777, '{"total_beds": 50, "available_beds": 35, "icu_beds": 10, "emergency_services": true, "ambulance_available": true, "oxygen_available": true, "phone": "022-23456789"}', 0.85, 'Rahul Sharma', '{}'),
  ('shelter', 'pending', 'Community Hall - Relief Camp', 'Large community hall that can be used as temporary shelter during floods.', 'Surat, Gujarat', 'Gujarat', 'Surat', 21.1702, 72.8311, '{"capacity": 200, "available_occupancy": 180, "facilities": ["Drinking Water", "Electricity", "Kitchen", "Sanitation"], "phone": "9876543234"}', 0.72, 'Priya Patel', '{}'),
  ('incident', 'pending', 'Building Fire in Andheri', 'Major fire reported in a commercial building in Andheri West. 2 injured.', 'Mumbai, Maharashtra', 'Maharashtra', 'Mumbai', 19.1196, 72.8469, '{"incident_type": "fire", "severity": "high", "status": "active", "assigned_team": "Mumbai Fire Brigade", "reported_at": "2026-06-04T10:30:00Z"}', 0.63, 'Amit Singh', '{}'),
  ('hospital', 'pending', 'Fortis Hospital - Emergency Dept', 'Expanded emergency department with 20 additional beds and triage facility.', 'Delhi, Delhi', 'Delhi', 'Delhi', 28.6129, 77.2295, '{"total_beds": 20, "available_beds": 12, "icu_beds": 5, "emergency_services": true, "ambulance_available": false, "oxygen_available": true, "phone": "011-23456789"}', 0.91, 'Sneha Reddy', '{}'),
  ('shelter', 'pending', 'School Building - Temporary Shelter', 'Government school with large playground and multiple classrooms.', 'Chennai, Tamil Nadu', 'Tamil Nadu', 'Chennai', 13.0827, 80.2707, '{"capacity": 500, "available_occupancy": 450, "facilities": ["Drinking Water", "Electricity", "Kitchen", "Medical Room", "Sanitation", "Children Area"], "phone": "9876543235"}', 0.78, 'Deepa Nair', '{}'),
  ('incident', 'pending', 'Waterlogging in Central Area', 'Severe waterlogging in low-lying areas after continuous rainfall. 50+ families affected.', 'Kolkata, West Bengal', 'West Bengal', 'Kolkata', 22.5726, 88.3639, '{"incident_type": "flood", "severity": "high", "status": "active", "assigned_team": "KMC Disaster Management", "reported_at": "2026-06-04T08:00:00Z"}', 0.55, 'Vikram Joshi', '{}')
on conflict do nothing;
