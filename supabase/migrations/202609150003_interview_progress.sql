alter table public.interview_sessions
  add column if not exists program_day int not null default 1 check (program_day between 1 and 15),
  add column if not exists average_score int check (average_score between 0 and 100),
  add column if not exists retry_count int not null default 0 check (retry_count >= 0),
  add column if not exists session_summary jsonb not null default '{}';

create index if not exists interview_sessions_program_day_idx
  on public.interview_sessions(user_id, program_day, ended_at desc);

create or replace function public.save_interview_session(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  program_id uuid;
  session_id uuid;
  question_id uuid;
  answer_id uuid;
  session_day int;
  total_days int := 15;
  average_score int;
  threshold int;
  passed boolean;
  next_day int;
  next_status text;
  scores jsonb;
  saved_summary jsonb;
  completed_days jsonb;
  stored_current_day int;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'Invalid interview payload'; end if;

  session_day := (payload->>'programDay')::int;
  scores := payload->'evaluation'->'scores';
  if session_day not between 1 and total_days then raise exception 'Interview day must be between 1 and 15'; end if;
  if payload->>'difficulty' not in ('Beginner', 'Normal', 'Advanced') then raise exception 'Invalid interview difficulty'; end if;
  if payload->>'personality' not in ('Friendly Mentor', 'Professional HR', 'Technical Engineer', 'Project Reviewer', 'Strict Interviewer', 'Panel Interview') then raise exception 'Invalid interviewer personality'; end if;
  if (payload->>'beforeConfidence')::int not between 1 and 10 or (payload->>'afterConfidence')::int not between 1 and 10 then
    raise exception 'Confidence must be between 1 and 10';
  end if;
  if coalesce(length(trim(payload->>'question')), 0) < 5 or coalesce(length(trim(payload->>'answer')), 0) < 20 then
    raise exception 'Question and answer are required';
  end if;
  if scores is null or jsonb_typeof(scores) <> 'object' then raise exception 'Validated scorecard is required'; end if;
  if not (scores ?& array['clarity','relevance','technicalAccuracy','answerStructure','communication','completeness','uncertaintyHandling']) then
    raise exception 'The interview scorecard is incomplete';
  end if;
  if exists (
    select 1 from jsonb_each_text(scores) score
    where score.value::int not between 0 and 100
  ) then raise exception 'Every interview score must be between 0 and 100'; end if;
  average_score := round((
    (scores->>'clarity')::int + (scores->>'relevance')::int + (scores->>'technicalAccuracy')::int
    + (scores->>'answerStructure')::int + (scores->>'communication')::int
    + (scores->>'completeness')::int + (scores->>'uncertaintyHandling')::int
  ) / 7.0);

  select program.id, program.total_days, program.current_day into program_id, total_days, stored_current_day
  from public.interview_programs program
  where program.user_id = current_user_id
  order by program.created_at desc
  limit 1;

  if program_id is null then
    if session_day <> 1 then raise exception 'The interview journey must start at Day 1'; end if;
    insert into public.interview_programs (user_id, title, mode, current_day, total_days, status, configuration)
    values (current_user_id, '15-day interview confidence journey', case when (payload->>'confidenceMode')::boolean then 'confidence' else 'standard' end, session_day, 15, 'active', '{}')
    returning id into program_id;
    total_days := 15;
    stored_current_day := 1;
  elsif session_day <> stored_current_day then
    raise exception 'This interview day is not the current adaptive checkpoint';
  end if;

  threshold := case payload->>'difficulty' when 'Advanced' then 70 when 'Normal' then 64 else 56 end;
  passed := average_score >= threshold;
  next_day := case when passed then least(total_days, session_day + 1) else session_day end;
  next_status := case when passed and session_day = total_days then 'completed' else 'active' end;

  insert into public.interview_sessions (
    user_id, interview_program_id, session_type, personality, difficulty, voice_enabled,
    status, started_at, ended_at, program_day, average_score, retry_count, session_summary
  ) values (
    current_user_id, program_id, case when (payload->>'confidenceMode')::boolean then 'confidence' else 'standard' end,
    payload->>'personality', payload->>'difficulty', coalesce((payload->>'voiceEnabled')::boolean, false),
    'completed', now(), now(), session_day, average_score, coalesce((payload->>'retryCount')::int, 0), '{}'
  ) returning id into session_id;

  saved_summary := jsonb_set(
    jsonb_set(payload, '{id}', to_jsonb(session_id::text), true),
    '{completedAt}', to_jsonb(now()::text), true
  );
  saved_summary := jsonb_set(saved_summary, '{passed}', to_jsonb(passed), true);
  update public.interview_sessions set session_summary = saved_summary where id = session_id;

  insert into public.interview_questions (user_id, interview_session_id, prompt, question_type, context_source, position)
  values (
    current_user_id, session_id, payload->>'question', 'program_day_' || session_day,
    jsonb_build_object('programTitle', payload->>'programTitle', 'projectId', payload->>'projectId'), 1
  ) returning id into question_id;

  insert into public.interview_answers (user_id, interview_question_id, answer_text, retry_number)
  values (current_user_id, question_id, payload->>'answer', coalesce((payload->>'retryCount')::int, 0))
  returning id into answer_id;

  insert into public.interview_feedback (
    user_id, interview_answer_id, clarity, relevance, technical_accuracy, answer_structure,
    communication, completeness, uncertainty_handling, did_well, improve, better_structure, generated_by
  ) values (
    current_user_id, answer_id, (scores->>'clarity')::int, (scores->>'relevance')::int,
    (scores->>'technicalAccuracy')::int, (scores->>'answerStructure')::int,
    (scores->>'communication')::int, (scores->>'completeness')::int,
    (scores->>'uncertaintyHandling')::int, payload->'evaluation'->>'didWell',
    payload->'evaluation'->>'improve', payload->'evaluation'->>'betterStructure',
    case when payload->>'evaluationSource' = 'ai' then 'ai' else 'local' end
  );

  insert into public.confidence_logs (user_id, interview_session_id, phase, score)
  values
    (current_user_id, session_id, 'before', (payload->>'beforeConfidence')::int),
    (current_user_id, session_id, 'after', (payload->>'afterConfidence')::int);

  select coalesce(jsonb_agg(distinct program_day order by program_day), '[]'::jsonb)
  into completed_days
  from public.interview_sessions
  where user_id = current_user_id and interview_program_id = program_id and status = 'completed'
    and average_score >= case difficulty when 'Advanced' then 70 when 'Normal' then 64 else 56 end;

  update public.interview_programs
  set current_day = next_day,
      status = next_status,
      mode = case when (payload->>'confidenceMode')::boolean then 'confidence' else 'standard' end,
      configuration = jsonb_build_object(
        'repeatCount', case when passed then 0 else coalesce((configuration->>'repeatCount')::int, 0) + 1 end,
        'completedDays', completed_days,
        'lastAdjustmentMessage', case
          when next_status = 'completed' then 'You completed the confidence journey. Keep practicing targeted sessions before interviews.'
          when passed then 'Your previous answer met the checkpoint. The next interview day is ready.'
          else 'This interview day will repeat with a gentler focus. Progress is saved with no penalty.'
        end
      ),
      updated_at = now()
  where id = program_id and user_id = current_user_id;

  return jsonb_build_object('session_id', session_id, 'current_day', next_day, 'program_status', next_status, 'passed', passed);
end;
$$;

grant execute on function public.save_interview_session(jsonb) to authenticated;
