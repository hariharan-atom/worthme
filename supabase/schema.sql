-- Public shares contain only the display result. Raw questionnaire answers are never stored.
create table if not exists public.results (
  slug text primary key check (slug ~ '^[a-z0-9]{10}$'),
  public_result jsonb not null check (coalesce(octet_length(public_result ->> 'profileImage'), 0) <= 102400),
  created_at timestamptz not null default now()
);

alter table public.results enable row level security;
-- The server route uses the service-role key; browser clients have no table access.
create policy "No direct public table access" on public.results for all using (false) with check (false);

create index if not exists results_created_at_idx on public.results (created_at desc);

-- Safe to run on an existing V1 database too.
alter table public.results drop constraint if exists results_profile_image_limit;
alter table public.results add constraint results_profile_image_limit
  check (coalesce(octet_length(public_result ->> 'profileImage'), 0) <= 102400);