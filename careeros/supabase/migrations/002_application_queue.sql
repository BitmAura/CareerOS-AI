-- CareerOS — daily assisted-apply queue (local + Supabase)
create table if not exists public.application_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  digest_date date not null,
  match_score int not null default 0,
  status text not null default 'queued',
  tailored_markdown text,
  cover_letter text,
  resume_version_id uuid references public.resume_versions(id),
  notes text,
  apply_url text,
  prepared_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id, digest_date)
);

alter table public.application_queue enable row level security;

create policy "queue_own" on public.application_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists application_queue_user_date_idx
  on public.application_queue (user_id, digest_date);
