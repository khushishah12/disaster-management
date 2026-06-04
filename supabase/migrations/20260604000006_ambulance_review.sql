alter table public.ambulance_reports
  add column review_status text not null default 'pending'
    constraint ambulance_reports_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));

alter table public.ambulance_reports
  add column verified_by uuid references auth.users(id) on delete set null;

alter table public.ambulance_reports
  add column verified_at timestamptz;

alter table public.ambulance_reports
  add column rejection_reason text;

alter table public.ambulance_reports
  add column reviewer_notes text;

alter table public.ambulance_reports
  add column edited_data jsonb;
