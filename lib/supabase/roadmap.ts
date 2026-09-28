import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPrepJourney } from "@/lib/prep-history";
import type { MissionTask, MissionTaskType, PrepJourney, RoadmapPlan, TaskStatus } from "@/lib/types";

const taskTypes = new Set<MissionTaskType>(["learn", "practice", "assess", "build", "prove"]);
const taskStatuses = new Set<TaskStatus>(["pending", "in_progress", "paused", "completed", "skipped", "rescheduled"]);

export async function saveRoadmapToSupabase(plan: RoadmapPlan) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("save_generated_roadmap", { payload: plan });
  if (error) throw new Error(error.message);
}

export async function updateTaskStatusInSupabase(taskId: string, status: TaskStatus, scheduledFor?: string) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("update_mission_task_status", {
    task_id: taskId,
    new_status: status,
    new_scheduled_for: scheduledFor ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function loadActiveRoadmapFromSupabase(): Promise<RoadmapPlan | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: roadmap, error: roadmapError } = await supabase
    .from("roadmaps")
    .select("id, generation_context")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (roadmapError) throw new Error(roadmapError.message);
  if (!roadmap) return null;

  const stored = roadmap.generation_context as unknown;
  if (!isRoadmapPlan(stored)) throw new Error("The saved roadmap is invalid. Please generate it again.");
  const { data: rows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, description, task_type, status, estimated_minutes, scheduled_for, priority, carry_forward_count, completion_criteria")
    .eq("roadmap_id", roadmap.id)
    .order("created_at", { ascending: true });
  if (taskError) throw new Error(taskError.message);

  const originalTasks = new Map(stored.tasks.map((task) => [task.id, task]));
  const tasks = (rows ?? []).map((row) => {
    const original = originalTasks.get(row.id);
    const type = taskTypes.has(row.task_type as MissionTaskType) ? row.task_type as MissionTaskType : "learn";
    const status = taskStatuses.has(row.status as TaskStatus) ? row.status as TaskStatus : "pending";
    const criteria = Array.isArray(row.completion_criteria) ? String(row.completion_criteria[0] ?? "Complete the task.") : "Complete the task.";
    return {
      id: row.id,
      title: row.title,
      detail: row.description ?? original?.detail ?? "Complete this roadmap task.",
      type,
      status,
      minutes: row.estimated_minutes,
      skill: original?.skill ?? stored.focus,
      topics: original?.topics ?? [stored.focus],
      priority: row.priority,
      completionCriteria: original?.completionCriteria ?? criteria,
      expectedOutcome: original?.expectedOutcome ?? "Create visible progress toward the goal.",
      scheduledFor: row.scheduled_for ?? original?.scheduledFor ?? new Date().toISOString().slice(0, 10),
      carryForwardCount: row.carry_forward_count,
    } satisfies MissionTask;
  });
  return { ...stored, id: roadmap.id, tasks };
}

export async function loadRoadmapHistoryFromSupabase(): Promise<PrepJourney[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("roadmaps")
    .select("id, status, generation_context, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const stored = row.generation_context as unknown;
    if (!isRoadmapPlan(stored)) return [];
    const roadmap = { ...stored, id: row.id, createdAt: row.created_at ?? stored.createdAt };
    const active = row.status === "active";
    return [createPrepJourney(roadmap, active ? "active" : "paused", active, row.updated_at ?? roadmap.createdAt)];
  });
}

function isRoadmapPlan(value: unknown): value is RoadmapPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<RoadmapPlan>;
  return typeof plan.id === "string" && typeof plan.goal === "string" && typeof plan.track === "string" && Array.isArray(plan.milestones) && Array.isArray(plan.tasks);
}
