create type public.equipment_status as enum ('working', 'unavailable', 'uncertain');
create type public.equipment_category as enum ('component', 'tool', 'power', 'software');
create type public.evidence_status as enum ('not_submitted', 'submitted', 'ai_reviewed', 'revision_requested', 'mentor_reviewed');
create type public.review_method as enum ('none', 'ai', 'mentor');

create table public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  exact_model text,
  quantity int not null default 1 check (quantity between 1 and 1000),
  status public.equipment_status not null default 'uncertain',
  category public.equipment_category not null default 'component',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.build_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  budget numeric(12,2) check (budget is null or budget >= 0),
  currency text not null default 'INR' check (length(currency) between 3 and 8),
  available_minutes int not null default 45 check (available_minutes between 0 and 1440),
  current_knowledge text not null default '',
  target_role text not null default '',
  preferred_difficulty text not null default 'starter' check (preferred_difficulty in ('starter','intermediate','advanced')),
  hardware_preference text not null default 'either' check (hardware_preference in ('hardware','simulation','either')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  career_track_id uuid references public.career_tracks(id) on delete set null,
  problem_statement text not null,
  career_relevance text not null,
  difficulty text not null check (difficulty in ('starter','intermediate','advanced')),
  implementation_mode text not null check (implementation_mode in ('hardware','simulation')),
  estimated_minutes int not null check (estimated_minutes > 0),
  guidance jsonb not null default '{}',
  template_source text not null,
  revision text not null,
  compatibility_notes text not null,
  review_status text not null default 'draft' check (review_status in ('draft','reviewed','retired')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_template_components (
  id uuid primary key default gen_random_uuid(),
  project_template_id uuid not null references public.project_templates(id) on delete cascade,
  name text not null,
  aliases jsonb not null default '[]',
  quantity int not null default 1 check (quantity > 0),
  requirement text not null check (requirement in ('required','optional')),
  category public.equipment_category not null,
  model_notes text,
  power_notes text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_template_id, position)
);

alter table public.projects
  add column if not exists project_template_id uuid references public.project_templates(id) on delete set null,
  add column if not exists template_revision text,
  add column if not exists implementation_mode text check (implementation_mode is null or implementation_mode in ('hardware','simulation','hybrid'));

create table public.evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_milestone_id uuid references public.project_milestones(id) on delete set null,
  evidence_type text not null check (evidence_type in ('source_code','github','circuit_diagram','test_observation','image','demo_video','debugging_note','limitations','contribution')),
  title text not null,
  content text not null,
  selected_url text,
  storage_path text,
  expected_result text,
  actual_result text,
  personal_contribution text,
  debugging_notes text,
  limitations text,
  status public.evidence_status not null default 'submitted',
  fingerprint text not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create table public.mentor_authorizations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  scope jsonb not null default '{}',
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, mentor_id),
  check (student_id <> mentor_id)
);

create table public.evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  evidence_submission_id uuid not null references public.evidence_submissions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_method public.review_method not null,
  rubric_version text not null,
  resulting_status public.evidence_status not null,
  feedback text not null,
  review_limitations text not null,
  code_executed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_method <> 'none'),
  check (review_method <> 'mentor' or reviewer_id is not null),
  check (review_method <> 'ai' or resulting_status <> 'mentor_reviewed')
);

create table public.evidence_skill_links (
  evidence_submission_id uuid not null references public.evidence_submissions(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  scope text not null default '',
  created_at timestamptz not null default now(),
  primary key (evidence_submission_id, skill_id)
);

create table public.role_exploration_activities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  career_track_id uuid references public.career_tracks(id) on delete set null,
  title text not null,
  represents text not null,
  estimated_minutes int not null check (estimated_minutes > 0),
  prerequisites jsonb not null default '[]',
  required_tools jsonb not null default '[]',
  instructions jsonb not null default '[]',
  expected_output text not null,
  beginner_support jsonb not null default '[]',
  reflection_questions jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_exploration_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.role_exploration_activities(id) on delete restrict,
  enjoyed text not null check (enjoyed in ('yes','unsure','no')),
  interesting_part text not null default '',
  difficult_part text not null default '',
  wants_another boolean not null default false,
  output_note text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  reason text not null,
  requested_minutes int not null check (requested_minutes between 0 and 1440),
  status text not null default 'preview' check (status in ('preview','applied','undone')),
  change_summary text not null,
  explanation text not null,
  moved_task_ids jsonb not null default '[]',
  deadline_effect text not null,
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  applied_at timestamptz,
  undone_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('github','circuit_simulator')),
  external_account_id text,
  permission_scope jsonb not null default '[]',
  selected_resources jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending','active','revoked','error')),
  last_error text,
  connected_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_equipment_user_status_idx on public.user_equipment(user_id, status, category);
create index project_templates_track_review_idx on public.project_templates(career_track_id, review_status);
create index evidence_submissions_user_project_idx on public.evidence_submissions(user_id, project_id, submitted_at desc);
create index evidence_reviews_submission_idx on public.evidence_reviews(evidence_submission_id, created_at desc);
create index mentor_authorizations_lookup_idx on public.mentor_authorizations(student_id, mentor_id, status);
create index role_exploration_attempts_user_idx on public.role_exploration_attempts(user_id, completed_at desc);
create index plan_adjustments_user_idx on public.plan_adjustments(user_id, created_at desc);
create index integration_connections_user_provider_idx on public.integration_connections(user_id, provider, status);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'user_equipment','build_preferences','project_templates','project_template_components','evidence_submissions',
    'mentor_authorizations','evidence_reviews','role_exploration_activities','role_exploration_attempts',
    'plan_adjustments','integration_connections'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.user_equipment enable row level security;
alter table public.build_preferences enable row level security;
alter table public.project_templates enable row level security;
alter table public.project_template_components enable row level security;
alter table public.evidence_submissions enable row level security;
alter table public.mentor_authorizations enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.evidence_skill_links enable row level security;
alter table public.role_exploration_activities enable row level security;
alter table public.role_exploration_attempts enable row level security;
alter table public.plan_adjustments enable row level security;
alter table public.integration_connections enable row level security;

create policy user_equipment_owner on public.user_equipment for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy build_preferences_owner on public.build_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy project_templates_read_reviewed on public.project_templates for select to authenticated using (review_status = 'reviewed');
create policy project_template_components_read_reviewed on public.project_template_components for select to authenticated using (exists (select 1 from public.project_templates t where t.id = project_template_id and t.review_status = 'reviewed'));
create policy evidence_submissions_owner on public.evidence_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy evidence_submissions_authorized_mentor_read on public.evidence_submissions for select using (exists (select 1 from public.mentor_authorizations a where a.student_id = user_id and a.mentor_id = auth.uid() and a.status = 'active'));
create policy mentor_authorizations_student_manage on public.mentor_authorizations for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy mentor_authorizations_mentor_read on public.mentor_authorizations for select using (auth.uid() = mentor_id);
create policy evidence_reviews_student_read on public.evidence_reviews for select using (auth.uid() = student_id);
create policy evidence_reviews_authorized_mentor_insert on public.evidence_reviews for insert with check (auth.uid() = reviewer_id and review_method = 'mentor' and exists (select 1 from public.mentor_authorizations a where a.student_id = student_id and a.mentor_id = auth.uid() and a.status = 'active'));
create policy evidence_reviews_reviewer_read on public.evidence_reviews for select using (auth.uid() = reviewer_id);
create policy evidence_skill_links_owner on public.evidence_skill_links for all using (exists (select 1 from public.evidence_submissions e where e.id = evidence_submission_id and e.user_id = auth.uid())) with check (exists (select 1 from public.evidence_submissions e where e.id = evidence_submission_id and e.user_id = auth.uid()));
create policy role_exploration_activities_read on public.role_exploration_activities for select to authenticated using (active = true);
create policy role_exploration_attempts_owner on public.role_exploration_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy plan_adjustments_owner on public.plan_adjustments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy integration_connections_owner on public.integration_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence-private', 'evidence-private', false, 15728640, array['image/png','image/jpeg','image/webp','application/pdf','text/plain','text/markdown','application/zip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_files_owner_read on storage.objects for select using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy evidence_files_owner_insert on storage.objects for insert with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy evidence_files_owner_update on storage.objects for update using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = auth.uid()::text);
create policy evidence_files_owner_delete on storage.objects for delete using (bucket_id = 'evidence-private' and (storage.foldername(name))[1] = auth.uid()::text);

grant select on public.project_templates, public.project_template_components, public.role_exploration_activities to authenticated;
grant select, insert, update, delete on public.user_equipment, public.build_preferences, public.evidence_submissions, public.evidence_reviews, public.evidence_skill_links, public.role_exploration_attempts, public.plan_adjustments, public.integration_connections, public.mentor_authorizations to authenticated;
