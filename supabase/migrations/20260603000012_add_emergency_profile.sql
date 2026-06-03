-- Emergency profile fields for civilians
alter table public.profiles
  add column if not exists blood_type text,
  add column if not exists medical_conditions text,
  add column if not exists allergies text,
  add column if not exists emergency_contacts_json jsonb default '[]'::jsonb;

comment on column public.profiles.blood_type is 'Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)';
comment on column public.profiles.medical_conditions is 'Pre-existing medical conditions';
comment on column public.profiles.allergies is 'Known allergies';
comment on column public.profiles.emergency_contacts_json is 'JSON array of emergency contacts [{name, phone, relationship}]';
