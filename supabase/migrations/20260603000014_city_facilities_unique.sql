-- Add unique constraint for upsert deduplication
alter table public.city_facilities
  add constraint city_facilities_unique_city_name_type
  unique (city, state, name, type);
