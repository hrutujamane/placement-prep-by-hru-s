create extension if not exists pgcrypto;

create type public.task_status as enum ('pending', 'in_progress', 'paused', 'completed', 'skipped', 'rescheduled');
create type public.skill_state as enum ('not_started', 'learning', 'practiced', 'assessed', 'project_completed', 'verified');
create type public.project_status as enum ('planning', 'building', 'testing', 'completed', 'archived');
create type public.application_status as enum ('interested', 'applied', 'assessment', 'interview', 'offer', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  college text,
  branch text,
  academic_year text,
  semester text,
  weekday_hours numeric(4,1) not null default 1,
  saturday_hours numeric(4,1) not null default 0,
  sunday_hours numeric(4,1) not null default 0,
  learning_method text not null default 'Mixed',
  course_preference text not null default 'Free only',
  programming_comfort text not null default 'None',
  electronics_level text not null default 'Beginner',
  onboarding_complete boolean not null default false,
  first_90_days_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  role_overview text,
  difficulty text,
  estimated_months int,
  programming_requirements jsonb not null default '[]',
  tools jsonb not null default '[]',
  opportunities jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  career_track_id uuid references public.career_tracks(id) on delete set null,
  goal_type text not null,
  target_role text,
  target_company text,
  target_date date,
  status text not null default 'active',
  priority int not null default 1 check (priority between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text,
  verification_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skill_dependencies (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  prerequisite_skill_id uuid not null references public.skills(id) on delete cascade,
  minimum_progress int not null default 60 check (minimum_progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(skill_id, prerequisite_skill_id),
  check (skill_id <> prerequisite_skill_id)
);

create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  state public.skill_state not null default 'not_started',
  progress int not null default 0 check (progress between 0 and 100),
  evidence jsonb not null default '[]',
  last_assessed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, skill_id)
);

create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  career_goal_id uuid references public.career_goals(id) on delete cascade,
  title text not null,
  horizon text not null,
  start_date date not null default current_date,
  target_date date,
  status text not null default 'active',
  generated_by text not null default 'system',
  generation_context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  title text not null,
  description text,
  position int not null,
  due_date date,
  completion_criteria jsonb not null default '[]',
  progress int not null default 0 check (progress between 0 and 100),
  status text not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(roadmap_id, position)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roadmap_id uuid references public.roadmaps(id) on delete cascade,
  milestone_id uuid references public.roadmap_milestones(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  title text not null,
  description text,
  task_type text not null,
  status public.task_status not null default 'pending',
  estimated_minutes int not null check (estimated_minutes > 0),
  scheduled_for date,
  due_at timestamptz,
  completed_at timestamptz,
  priority int not null default 3 check (priority between 1 and 5),
  carry_forward_count int not null default 0,
  completion_criteria jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text not null,
  url text not null,
  difficulty text,
  duration_text text,
  cost_type text,
  price_text text,
  topics jsonb not null default '[]',
  recommendation_reason text,
  verified_at timestamptz,
  verification_source text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(url)
);

create table public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  status text not null default 'saved',
  progress int not null default 0 check (progress between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, resource_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  career_goal_id uuid references public.career_goals(id) on delete set null,
  name text not null,
  status public.project_status not null default 'planning',
  description text,
  problem_statement text,
  technologies jsonb not null default '[]',
  components jsonb not null default '[]',
  skills jsonb not null default '[]',
  architecture jsonb not null default '{}',
  safety_notes jsonb not null default '[]',
  github_url text,
  demo_url text,
  image_urls jsonb not null default '[]',
  video_url text,
  completion_date date,
  project_notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  position int not null,
  status text not null default 'pending',
  testing_procedure text,
  evidence jsonb not null default '[]',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, position)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete set null,
  title text not null,
  quiz_type text not null,
  difficulty text not null,
  time_limit_seconds int,
  source text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_type text not null,
  prompt text not null,
  options jsonb,
  correct_answer jsonb not null,
  explanation text not null,
  topic text,
  position int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quiz_id, position)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  answers jsonb not null default '[]',
  score numeric(5,2) not null check (score between 0 and 100),
  accuracy numeric(5,2) check (accuracy between 0 and 100),
  duration_seconds int,
  weak_topics jsonb not null default '[]',
  strong_topics jsonb not null default '[]',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  focused_minutes int not null default 0,
  interruptions int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  mode text not null,
  current_day int not null default 1,
  total_days int not null default 15,
  status text not null default 'active',
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_program_id uuid references public.interview_programs(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  session_type text not null,
  personality text not null,
  difficulty text not null,
  voice_enabled boolean not null default false,
  status text not null default 'started',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_session_id uuid not null references public.interview_sessions(id) on delete cascade,
  prompt text not null,
  question_type text not null,
  context_source jsonb not null default '{}',
  position int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(interview_session_id, position)
);

create table public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_question_id uuid not null references public.interview_questions(id) on delete cascade,
  answer_text text,
  audio_storage_path text,
  duration_seconds int,
  retry_number int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_answer_id uuid not null references public.interview_answers(id) on delete cascade,
  clarity int check (clarity between 0 and 100),
  relevance int check (relevance between 0 and 100),
  technical_accuracy int check (technical_accuracy between 0 and 100),
  answer_structure int check (answer_structure between 0 and 100),
  communication int check (communication between 0 and 100),
  completeness int check (completeness between 0 and 100),
  uncertainty_handling int check (uncertainty_handling between 0 and 100),
  did_well text,
  improve text,
  better_structure text,
  generated_by text not null default 'ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.confidence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interview_session_id uuid references public.interview_sessions(id) on delete cascade,
  phase text not null check (phase in ('before', 'after')),
  score int not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_type text not null,
  title text not null,
  description text,
  evidence jsonb not null default '{}',
  earned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  job_description text,
  application_date date,
  deadline date,
  status public.application_status not null default 'interested',
  assessment_at timestamptz,
  interview_at timestamptz,
  offer_details jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_role text,
  title text not null,
  content jsonb not null,
  source_file_path text,
  analysis jsonb,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_type text not null,
  model text not null,
  request_summary text not null,
  messages jsonb not null default '[]',
  structured_result jsonb,
  prompt_version text,
  input_tokens int,
  output_tokens int,
  cached boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.placement_readiness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  categories jsonb not null,
  explanation jsonb not null default '[]',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interview_readiness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  categories jsonb not null,
  explanation jsonb not null default '[]',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index career_goals_user_idx on public.career_goals(user_id, status);
create index user_skills_user_state_idx on public.user_skills(user_id, state);
create index roadmaps_user_status_idx on public.roadmaps(user_id, status);
create index roadmap_milestones_roadmap_position_idx on public.roadmap_milestones(roadmap_id, position);
create index tasks_user_schedule_idx on public.tasks(user_id, scheduled_for, status);
create index task_history_task_idx on public.task_history(task_id, created_at desc);
create index saved_resources_user_idx on public.saved_resources(user_id, status);
create index projects_user_status_idx on public.projects(user_id, status);
create index project_milestones_project_idx on public.project_milestones(project_id, position);
create index quiz_attempts_user_idx on public.quiz_attempts(user_id, completed_at desc);
create index study_sessions_user_started_idx on public.study_sessions(user_id, started_at desc);
create index interview_sessions_user_started_idx on public.interview_sessions(user_id, started_at desc);
create index confidence_logs_user_idx on public.confidence_logs(user_id, created_at desc);
create index job_applications_user_status_idx on public.job_applications(user_id, status);
create index ai_conversations_user_type_idx on public.ai_conversations(user_id, conversation_type, created_at desc);
create index placement_readiness_user_idx on public.placement_readiness_history(user_id, calculated_at desc);
create index interview_readiness_user_idx on public.interview_readiness_history(user_id, calculated_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','career_tracks','career_goals','skills','skill_dependencies','user_skills','roadmaps','roadmap_milestones','tasks','task_history','resources','saved_resources','projects','project_milestones','quizzes','quiz_questions','quiz_attempts','study_sessions','interview_programs','interview_sessions','interview_questions','interview_answers','interview_feedback','confidence_logs','achievements','job_applications','resume_versions','ai_conversations','placement_readiness_history','interview_readiness_history'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Student'), '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.career_tracks enable row level security;
alter table public.career_goals enable row level security;
alter table public.skills enable row level security;
alter table public.skill_dependencies enable row level security;
alter table public.user_skills enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;
alter table public.resources enable row level security;
alter table public.saved_resources enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.study_sessions enable row level security;
alter table public.interview_programs enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.interview_answers enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.confidence_logs enable row level security;
alter table public.achievements enable row level security;
alter table public.job_applications enable row level security;
alter table public.resume_versions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.placement_readiness_history enable row level security;
alter table public.interview_readiness_history enable row level security;

create policy profiles_owner on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy career_tracks_read on public.career_tracks for select to authenticated using (active = true);
create policy skills_read on public.skills for select to authenticated using (true);
create policy skill_dependencies_read on public.skill_dependencies for select to authenticated using (true);
create policy resources_read on public.resources for select to authenticated using (active = true);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'career_goals','user_skills','roadmaps','roadmap_milestones','tasks','task_history','saved_resources','projects','project_milestones','quizzes','quiz_questions','quiz_attempts','study_sessions','interview_programs','interview_sessions','interview_questions','interview_answers','interview_feedback','confidence_logs','achievements','job_applications','resume_versions','ai_conversations','placement_readiness_history','interview_readiness_history'
  ] loop
    execute format('create policy %I_owner on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select on public.career_tracks, public.skills, public.skill_dependencies, public.resources to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
