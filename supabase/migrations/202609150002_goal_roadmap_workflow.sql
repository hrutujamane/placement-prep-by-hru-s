create or replace function public.save_generated_roadmap(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  generated_goal_id uuid;
  generated_roadmap_id uuid;
  matched_track_id uuid;
  milestone jsonb;
  task jsonb;
  item_position int;
  planned_minutes int;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(payload) <> 'object'
    or coalesce(length(payload->>'goal'), 0) < 3
    or jsonb_typeof(payload->'milestones') <> 'array'
    or jsonb_typeof(payload->'tasks') <> 'array'
    or jsonb_array_length(payload->'tasks') not between 1 and 10 then
    raise exception 'Invalid roadmap payload';
  end if;

  select coalesce(sum((entry->>'minutes')::int), 0)
  into planned_minutes
  from jsonb_array_elements(payload->'tasks') as entry;

  if planned_minutes > (payload->>'availableMinutes')::int then
    raise exception 'Planned task time exceeds available time';
  end if;

  generated_roadmap_id := (payload->>'id')::uuid;
  select id into matched_track_id from public.career_tracks where lower(name) = lower(payload->>'track') limit 1;

  delete from public.roadmaps where id = generated_roadmap_id and user_id = current_user_id;
  update public.roadmaps set status = 'superseded' where user_id = current_user_id and status = 'active';
  update public.career_goals set status = 'superseded' where user_id = current_user_id and status = 'active';

  insert into public.career_goals (user_id, career_track_id, goal_type, target_role, target_date, status, priority, notes)
  values (current_user_id, matched_track_id, payload->>'goal', payload->>'track', nullif(payload->>'targetDate', '')::date, 'active', 1, payload->>'request')
  returning id into generated_goal_id;

  insert into public.roadmaps (id, user_id, career_goal_id, title, horizon, start_date, target_date, status, generated_by, generation_context)
  values (generated_roadmap_id, current_user_id, generated_goal_id, payload->>'goal', (payload->>'durationWeeks') || ' weeks', current_date, nullif(payload->>'targetDate', '')::date, 'active', 'hybrid', payload);

  item_position := 0;
  for milestone in select value from jsonb_array_elements(payload->'milestones') loop
    item_position := item_position + 1;
    insert into public.roadmap_milestones (id, user_id, roadmap_id, title, description, position, due_date, completion_criteria, progress, status)
    values (
      (milestone->>'id')::uuid,
      current_user_id,
      generated_roadmap_id,
      milestone->>'title',
      milestone->>'detail',
      item_position,
      nullif(milestone->>'dueDate', '')::date,
      coalesce(milestone->'completionCriteria', '[]'::jsonb),
      coalesce((milestone->>'progress')::int, 0),
      coalesce(milestone->>'status', 'upcoming')
    );
  end loop;

  for task in select value from jsonb_array_elements(payload->'tasks') loop
    insert into public.tasks (id, user_id, roadmap_id, title, description, task_type, status, estimated_minutes, scheduled_for, priority, carry_forward_count, completion_criteria)
    values (
      (task->>'id')::uuid,
      current_user_id,
      generated_roadmap_id,
      task->>'title',
      task->>'detail',
      task->>'type',
      coalesce(task->>'status', 'pending')::public.task_status,
      (task->>'minutes')::int,
      nullif(task->>'scheduledFor', '')::date,
      coalesce((task->>'priority')::int, 3),
      coalesce((task->>'carryForwardCount')::int, 0),
      jsonb_build_array(task->>'completionCriteria')
    );
  end loop;

  return generated_roadmap_id;
end;
$$;

create or replace function public.update_mission_task_status(task_id uuid, new_status public.task_status, new_scheduled_for date default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  previous_status public.task_status;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select status into previous_status from public.tasks where id = task_id and user_id = current_user_id for update;
  if previous_status is null then
    raise exception 'Task not found';
  end if;

  update public.tasks
  set status = new_status,
      scheduled_for = case when new_status = 'rescheduled' then coalesce(new_scheduled_for, current_date + 1) else scheduled_for end,
      completed_at = case when new_status = 'completed' then now() else null end,
      updated_at = now()
  where id = task_id and user_id = current_user_id;

  insert into public.task_history (user_id, task_id, from_status, to_status, reason, metadata)
  values (
    current_user_id,
    task_id,
    previous_status,
    new_status,
    case when new_status = 'rescheduled' then 'Student rescheduled task' else 'Student changed task status' end,
    case when new_scheduled_for is not null then jsonb_build_object('scheduled_for', new_scheduled_for) else '{}'::jsonb end
  );
end;
$$;

grant execute on function public.save_generated_roadmap(jsonb) to authenticated;
grant execute on function public.update_mission_task_status(uuid, public.task_status, date) to authenticated;
