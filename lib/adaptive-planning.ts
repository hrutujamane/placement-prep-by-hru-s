import type { MissionTask, PlanAdjustment } from "@/lib/types";

export const adjustmentReasons = [
  "I have only 20 minutes.",
  "I am stuck on this concept.",
  "My components have not arrived.",
  "I have a college exam tomorrow.",
  "I completed this faster than expected.",
  "I need a lighter session.",
] as const;

export interface AdjustmentInput {
  reason: string;
  availableMinutes: number;
  today: string;
  targetDate?: string;
  usualDailyMinutes: number;
}

export function createPlanAdjustment(tasks: MissionTask[], input: AdjustmentInput): PlanAdjustment {
  const id = `adjustment-${input.today}-${Math.max(0, input.availableMinutes)}-${slug(input.reason).slice(0, 24)}`;
  const completed = tasks.filter((task) => task.status === "completed");
  const open = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped");
  const skipped = tasks.filter((task) => task.status === "skipped");
  const prioritized = prioritize(open, input.reason);
  const tomorrow = addDays(input.today, 1);
  let remaining = Math.max(0, input.availableMinutes);
  const scheduledIds = new Set<string>();
  const taskUpdates = new Map<string, MissionTask>();
  const carryTasks: MissionTask[] = [];

  for (const task of prioritized) {
    if (remaining <= 0) break;
    if (task.minutes <= remaining) {
      taskUpdates.set(task.id, { ...task, status: "pending", scheduledFor: input.today });
      scheduledIds.add(task.id);
      remaining -= task.minutes;
      continue;
    }
    if (remaining >= 10) {
      taskUpdates.set(task.id, {
        ...task,
        minutes: remaining,
        status: "pending",
        scheduledFor: input.today,
        detail: `${task.detail} Focus only on a ${remaining}-minute checkpoint today; the remaining work is preserved separately.`,
        completionCriteria: `Complete and record the first ${remaining}-minute checkpoint; do not claim the full task is complete.`,
      });
      carryTasks.push({
        ...task,
        id: `${task.id}-carry-${id}`,
        title: `${task.title} — remaining work`,
        minutes: task.minutes - remaining,
        status: "rescheduled",
        scheduledFor: tomorrow,
        carryForwardCount: task.carryForwardCount + 1,
      });
      scheduledIds.add(task.id);
      remaining = 0;
    }
  }

  const movedTaskIds: string[] = [];
  const afterOpen = open.map((task) => {
    const update = taskUpdates.get(task.id);
    if (update) return update;
    movedTaskIds.push(task.id);
    return { ...task, status: "rescheduled" as const, scheduledFor: tomorrow, carryForwardCount: task.carryForwardCount + 1 };
  });
  const afterTasks = [...completed, ...afterOpen, ...carryTasks, ...skipped];
  const plannedMinutes = afterOpen.filter((task) => scheduledIds.has(task.id)).reduce((sum, task) => sum + task.minutes, 0);
  const movedMinutes = [...afterOpen.filter((task) => !scheduledIds.has(task.id)), ...carryTasks].reduce((sum, task) => sum + task.minutes, 0);
  const deadlineEffect = calculateDeadlineEffect(afterTasks, input, movedMinutes);

  return {
    id,
    reason: input.reason.trim() || "Today's availability changed.",
    requestedMinutes: input.availableMinutes,
    createdAt: new Date(`${input.today}T12:00:00.000Z`).toISOString(),
    status: "applied",
    changeSummary: `${plannedMinutes} minutes remain today; ${movedMinutes} minutes move to the next available session.`,
    why: explainReason(input.reason),
    movedTaskIds,
    deadlineEffect,
    beforeTasks: tasks.map((task) => ({ ...task })),
    afterTasks,
  };
}

export function undoPlanAdjustment(adjustment: PlanAdjustment) {
  return adjustment.beforeTasks.map((task) => ({ ...task }));
}

function prioritize(tasks: MissionTask[], reason: string) {
  const normalized = reason.toLowerCase();
  return [...tasks].sort((first, second) => {
    if (normalized.includes("components") || normalized.includes("hardware")) {
      const firstHardware = first.type === "build" ? 1 : 0;
      const secondHardware = second.type === "build" ? 1 : 0;
      if (firstHardware !== secondHardware) return firstHardware - secondHardware;
    }
    if (normalized.includes("lighter") || normalized.includes("exam") || normalized.includes("stuck")) {
      if (first.minutes !== second.minutes) return first.minutes - second.minutes;
    }
    return second.priority - first.priority || first.minutes - second.minutes;
  });
}

function calculateDeadlineEffect(tasks: MissionTask[], input: AdjustmentInput, movedMinutes: number) {
  if (!input.targetDate) return movedMinutes > 0 ? "Deadline not recalculated because no target date is saved." : "No deadline impact.";
  const today = new Date(`${input.today}T00:00:00.000Z`);
  const target = new Date(`${input.targetDate}T00:00:00.000Z`);
  const remainingDays = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
  const remainingWork = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").reduce((sum, task) => sum + task.minutes, 0);
  const capacity = remainingDays * Math.max(1, input.usualDailyMinutes);
  if (remainingWork > capacity) return "Deadline risk: remaining work exceeds the saved daily-time capacity. Choose reduced scope, a later deadline, or explicitly increase study time.";
  return movedMinutes > 0 ? "The saved deadline is still feasible at the current daily-time capacity, but the moved work remains visible." : "No deadline impact.";
}

function explainReason(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes("components")) return "Hardware-dependent work was moved; preparation, simulation, assessment and documentation were prioritized.";
  if (normalized.includes("stuck")) return "Shorter prerequisite and evidence checkpoints were prioritized before continuing the blocked task.";
  if (normalized.includes("exam")) return "The session was reduced to protect urgent college preparation without deleting roadmap work.";
  if (normalized.includes("faster")) return "The next highest-priority dependency-safe task was pulled forward within the new time budget.";
  if (normalized.includes("lighter")) return "Shorter tasks were prioritized to keep momentum without creating an unrealistic session.";
  return "The mission was rebuilt from unfinished tasks, priorities and the available-time limit.";
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
