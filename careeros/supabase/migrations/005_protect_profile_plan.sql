-- Prevent authenticated users from self-upgrading plan via RLS client updates.
-- Service role (billing APIs) bypasses RLS; trigger still allows service_role JWT.

create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      new.plan := 'starter';
    end if;
    return new;
  end if;

  if new.plan is distinct from old.plan
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_plan_trg on public.profiles;
create trigger protect_profile_plan_trg
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_plan();

revoke all on function public.protect_profile_plan() from public, anon, authenticated;
