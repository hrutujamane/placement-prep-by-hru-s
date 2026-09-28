create table public.student_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('Bug', 'Roadmap help', 'Learning content', 'Account', 'Feature request', 'Other')),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  page_path text not null default '/' check (char_length(page_path) <= 300),
  status text not null default 'Open' check (status in ('Open', 'In review', 'Resolved')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_reports_status_created_idx on public.student_reports(status, created_at desc);
create index student_reports_user_created_idx on public.student_reports(user_id, created_at desc);

create trigger set_student_reports_updated_at before update on public.student_reports
  for each row execute function public.set_updated_at();

alter table public.student_reports enable row level security;

create policy student_reports_owner_read on public.student_reports
  for select using (auth.uid() = user_id);

create policy student_reports_owner_insert on public.student_reports
  for insert with check (auth.uid() = user_id);
