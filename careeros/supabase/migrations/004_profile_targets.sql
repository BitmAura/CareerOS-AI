-- Applied on CareerOS project via MCP as careeros_profile_targets
alter table public.profiles
  add column if not exists career_targets jsonb not null default '{}'::jsonb;

alter table public.jobs
  add column if not exists source_kind text;

revoke execute on function public.handle_new_user() from anon, public;
