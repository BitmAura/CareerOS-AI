-- Hide invented beachhead catalog rows that have no apply URL.
update public.jobs
set is_active = false,
    updated_at = now()
where (source_url is null or btrim(source_url) = '')
  and coalesce(source, '') in ('manual', 'beachhead', '');
