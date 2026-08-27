-- Digest run tracking (3 searches / day) + optional slot on queue
create table if not exists public.digest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  digest_date date not null,
  slot text not null,
  created_count int not null default 0,
  ran_at timestamptz not null default now()
);

create index if not exists digest_runs_user_date_idx
  on public.digest_runs (user_id, digest_date);

alter table public.digest_runs enable row level security;

create policy "digest_runs_own" on public.digest_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.application_queue
  add column if not exists digest_slot text;
