alter table public.applications
  add column email text;

alter table public.applications
  add constraint applications_email_format
  check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
