alter table public.resume_versions
  add column if not exists target_company text,
  add column if not exists job_application_id uuid references public.job_applications(id) on delete set null,
  add column if not exists source_file_name text,
  add column if not exists role_alignment_score int check (role_alignment_score between 0 and 100),
  add column if not exists review_status text check (review_status in ('Needs revision', 'Developing', 'Ready for human review')),
  add column if not exists analysis_source text not null default 'local' check (analysis_source in ('local', 'ai'));

create index if not exists resume_versions_user_created_idx
  on public.resume_versions(user_id, created_at desc);

create index if not exists resume_versions_job_application_idx
  on public.resume_versions(job_application_id)
  where job_application_id is not null;

create index if not exists resume_versions_target_idx
  on public.resume_versions(user_id, target_company, target_role);

comment on column public.resume_versions.role_alignment_score is
  'Transparent resume completeness and supplied-job alignment score; never a hiring probability or claimed external ATS score.';

comment on column public.resume_versions.analysis_source is
  'local means deterministic in-app rubric; ai means a separately disclosed model-assisted review.';
