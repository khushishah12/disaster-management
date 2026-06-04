-- Incidents: individual emergency events (fires, floods, accidents, etc.)
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  incident_id text unique not null,
  title text not null,
  incident_type text not null,
  severity text not null default 'moderate' check (severity in ('critical','high','moderate','low')),
  location text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'active' check (status in ('active','monitoring','resolved','closed')),
  description text,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  response_time_minutes int,
  resolution_time_minutes int,
  assigned_team text,
  media_urls text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Incident timeline logs
create table if not exists public.incident_logs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  action text not null,
  description text,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Responders directory (mirrors rescue_team_members for analytics)
create table if not exists public.responders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text,
  email text,
  status text not null default 'available' check (status in ('available','deployed','offline')),
  location text,
  latitude double precision,
  longitude double precision,
  skills text[] default '{}',
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_incidents_type on public.incidents (incident_type);
create index if not exists idx_incidents_severity on public.incidents (severity);
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_incidents_reported_at on public.incidents (reported_at desc);
create index if not exists idx_incidents_location on public.incidents (location);
create index if not exists idx_incident_logs_incident on public.incident_logs (incident_id);

-- RLS
alter table public.incidents enable row level security;
alter table public.incident_logs enable row level security;
alter table public.responders enable row level security;

create policy "Anyone can read incidents" on public.incidents for select using (true);
create policy "Coordinators can insert incidents" on public.incidents for insert to authenticated with check (public.is_disaster_coordinator());
create policy "Coordinators can update incidents" on public.incidents for update to authenticated using (public.is_disaster_coordinator());

create policy "Anyone can read incident_logs" on public.incident_logs for select using (true);
create policy "Coordinators can insert incident_logs" on public.incident_logs for insert to authenticated with check (public.is_disaster_coordinator());

create policy "Anyone can read responders" on public.responders for select using (true);
create policy "Coordinators can manage responders" on public.responders for all to authenticated using (public.is_disaster_coordinator());

-- Seed sample incident data for testing
insert into public.incidents (incident_id, title, incident_type, severity, location, latitude, longitude, status, description, reported_at, resolved_at, response_time_minutes, resolution_time_minutes, assigned_team) values
  ('INC-2026-0001', 'Building Fire in Dadar', 'fire', 'critical', 'Mumbai, Maharashtra', 19.0178, 72.8478, 'resolved', 'Major fire in a residential building in Dadar West. 3 floors affected.', '2026-05-15 08:30:00+00', '2026-05-15 14:45:00+00', 8, 375, 'Mumbai Fire Brigade'),
  ('INC-2026-0002', 'Flooding in Kurla', 'flood', 'high', 'Mumbai, Maharashtra', 19.0678, 72.8789, 'resolved', 'Severe waterlogging in low-lying areas of Kurla. 200+ residents evacuated.', '2026-05-20 06:00:00+00', '2026-05-21 18:00:00+00', 15, 2160, 'NDRF Team A'),
  ('INC-2026-0003', 'Earthquake in Dharamshala', 'earthquake', 'critical', 'Dharamshala, Himachal Pradesh', 32.2190, 76.3234, 'active', '4.2 magnitude earthquake reported. Structural damage to 15+ buildings.', '2026-05-22 03:15:00+00', null, 5, null, 'Himachal Rescue Unit'),
  ('INC-2026-0004', 'Road Accident on NH-48', 'road_accident', 'high', 'Gurugram, Haryana', 28.4089, 76.9996, 'monitoring', 'Multi-vehicle collision on Delhi-Jaipur highway. 12 injured, 2 critical.', '2026-05-25 11:20:00+00', null, 12, null, 'Gurugram Traffic Police'),
  ('INC-2026-0005', 'Landslide in Munnar', 'landslide', 'high', 'Munnar, Kerala', 10.0889, 77.0595, 'active', 'Landslide blocked main road and damaged 3 tea estate buildings.', '2026-05-28 07:45:00+00', null, 20, null, 'Kerala Disaster Response'),
  ('INC-2026-0006', 'Gas Leak in Bhopal', 'other', 'moderate', 'Bhopal, Madhya Pradesh', 23.2599, 77.4126, 'resolved', 'LPG leak detected in industrial area. 2 km radius evacuated as precaution.', '2026-05-10 14:00:00+00', '2026-05-10 20:30:00+00', 10, 390, 'MP Fire Services'),
  ('INC-2026-0007', 'Cyclone Warning - Puri Coast', 'cyclone', 'critical', 'Puri, Odisha', 19.8135, 85.8312, 'monitoring', 'Cyclone alert issued for Puri coast. 5000+ being evacuated to shelters.', '2026-06-01 09:00:00+00', null, 6, null, 'Odisha Disaster Rapid Action'),
  ('INC-2026-0008', 'Medical Emergency - Mass Food Poisoning', 'medical', 'high', 'Patna, Bihar', 25.5941, 85.1376, 'active', 'Mass food poisoning at a wedding. 80+ people hospitalized.', '2026-06-02 16:30:00+00', null, 18, null, 'Patna Medical Team'),
  ('INC-2026-0009', 'Missing Person in Rishikesh', 'missing_person', 'moderate', 'Rishikesh, Uttarakhand', 30.0869, 78.2676, 'active', 'Tourist missing near Laxman Jhula. Search and rescue underway.', '2026-05-30 18:00:00+00', null, 25, null, 'Uttarakhand SDRF'),
  ('INC-2026-0010', 'Structural Collapse in Ahmedabad', 'structural_collapse', 'critical', 'Ahmedabad, Gujarat', 23.0225, 72.5714, 'resolved', 'Under-construction building collapsed. 5 dead, 23 rescued.', '2026-05-05 10:15:00+00', '2026-05-07 08:00:00+00', 7, 1305, 'Ahmedabad Fire & Rescue'),
  ('INC-2026-0011', 'Flood Relief in Chennai', 'flood', 'high', 'Chennai, Tamil Nadu', 13.0827, 80.2707, 'active', 'Heavy rains caused urban flooding. Several areas submerged.', '2026-06-03 05:00:00+00', null, 10, null, 'TN Disaster Management'),
  ('INC-2026-0012', 'Fire in Kolkata Market', 'fire', 'high', 'Kolkata, West Bengal', 22.5726, 88.3639, 'monitoring', 'Major fire in a wholesale market. Firefighters controlling spread.', '2026-05-28 22:00:00+00', null, 4, null, 'Kolkata Fire Brigade'),
  ('INC-2026-0013', 'Road Accident on MG Road', 'road_accident', 'low', 'Bengaluru, Karnataka', 12.9716, 77.5946, 'resolved', 'Two-wheeler collision with auto-rickshaw. Minor injuries reported.', '2026-05-18 09:45:00+00', '2026-05-18 11:00:00+00', 14, 75, 'Bengaluru Traffic'),
  ('INC-2026-0014', 'Earthquake in Joshimath', 'earthquake', 'high', 'Joshimath, Uttarakhand', 30.5550, 79.5636, 'active', 'Ground subsidence and mild tremors reported. Buildings developing cracks.', '2026-05-12 02:30:00+00', null, 9, null, 'Uttarakhand SDRF'),
  ('INC-2026-0015', 'Medical Camp Setup - Flood Victims', 'medical', 'moderate', 'Srinagar, Jammu and Kashmir', 34.0837, 74.7973, 'resolved', 'Temporary medical camp established for flood-affected areas.', '2026-04-20 08:00:00+00', '2026-05-01 18:00:00+00', 30, 16980, 'JKMHD'),
  ('INC-2026-0016', 'Missing Fishermen - Cyclone', 'missing_person', 'high', 'Kochi, Kerala', 9.9312, 76.2673, 'active', '3 fishing boats missing after sudden storm. Coast Guard deployed.', '2026-06-03 22:00:00+00', null, 12, null, 'Indian Coast Guard'),
  ('INC-2026-0017', 'Landslide in Darjeeling', 'landslide', 'critical', 'Darjeeling, West Bengal', 27.0410, 88.2663, 'active', 'Massive landslide due to continuous rainfall. 2 villages isolated.', '2026-06-04 06:00:00+00', null, 8, null, 'WB Disaster Management'),
  ('INC-2026-0018', 'Fire at Chemical Plant', 'fire', 'critical', 'Ankleshwar, Gujarat', 21.6266, 72.9951, 'resolved', 'Chemical plant fire with toxic fumes. 3 km radius evacuated.', '2026-05-08 03:00:00+00', '2026-05-09 12:00:00+00', 6, 1980, 'Gujarat Industrial Fire'),
  ('INC-2026-0019', 'Cyclone Landfall - Konark', 'cyclone', 'high', 'Konark, Odisha', 19.8876, 86.0948, 'active', 'Cyclone making landfall near Konark. Heavy winds and rain.', '2026-06-04 12:00:00+00', null, 3, null, 'Odisha Disaster Rapid Action'),
  ('INC-2026-0020', 'Building Collapse in Delhi', 'structural_collapse', 'critical', 'Delhi, Delhi', 28.7041, 77.1025, 'active', '4-storey building collapsed in Old Delhi. Rescue operations ongoing.', '2026-06-04 15:30:00+00', null, 5, null, 'Delhi Fire Service')
on conflict (incident_id) do nothing;

-- Seed incident logs
insert into public.incident_logs (incident_id, action, description) 
select id, 'reported', 'Incident reported via emergency hotline.' from public.incidents
union all
select id, 'responder_dispatched', 'Primary response team dispatched to location.' from public.incidents where status in ('active','monitoring','resolved')
union all
select id, 'resolved', 'Incident resolved and area secured.' from public.incidents where status = 'resolved'
on conflict do nothing;

-- Seed responders
insert into public.responders (name, role, phone, status, location, skills) values
  ('Rahul Sharma', 'Firefighter', '9876543210', 'deployed', 'Mumbai, Maharashtra', '{"fire fighting","rescue","hazmat"}'),
  ('Priya Patel', 'Paramedic', '9876543211', 'deployed', 'Mumbai, Maharashtra', '{"emergency medicine","trauma care"}'),
  ('Amit Singh', 'SDRF Commander', '9876543212', 'deployed', 'Dharamshala, Himachal Pradesh', '{"mountain rescue","disaster management"}'),
  ('Sneha Reddy', 'Medical Officer', '9876543213', 'available', 'Bengaluru, Karnataka', '{"emergency medicine","public health"}'),
  ('Vikram Joshi', 'Engineer', '9876543214', 'deployed', 'Ahmedabad, Gujarat', '{"structural assessment","debris removal"}'),
  ('Kiran Das', 'Rescue Specialist', '9876543215', 'available', 'Kolkata, West Bengal', '{"water rescue","confined space rescue"}'),
  ('Deepa Nair', 'Coordinator', '9876543216', 'deployed', 'Kochi, Kerala', '{"logistics","coordination"}'),
  ('Arun Kumar', 'Firefighter', '9876543217', 'offline', 'Delhi, Delhi', '{"fire fighting","rescue"}'),
  ('Meera Iyer', 'Paramedic', '9876543218', 'available', 'Chennai, Tamil Nadu', '{"emergency medicine","trauma care","pediatric care"}'),
  ('Rajesh Verma', 'SDRF Operator', '9876543219', 'deployed', 'Puri, Odisha', '{"cyclone response","water rescue"}')
on conflict do nothing;
