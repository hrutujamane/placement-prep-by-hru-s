import type { MissionTask, PrepJourney, PrepJourneyStatus, RoadmapPlan } from "@/lib/types";

export function createPrepJourney(
  roadmap: RoadmapPlan,
  status: PrepJourneyStatus = "active",
  isPrimary = status === "active",
  updatedAt = roadmap.createdAt,
  projectIds: string[] = [],
): PrepJourney {
  return {
    id: roadmap.id,
    title: roadmap.goal,
    status,
    isPrimary,
    createdAt: roadmap.createdAt,
    updatedAt,
    projectIds,
    roadmap,
  };
}

export function roadmapProgress(roadmap: RoadmapPlan) {
  if (!roadmap.milestones.length) return 0;
  return Math.round(roadmap.milestones.reduce((sum, milestone) => sum + milestone.progress, 0) / roadmap.milestones.length);
}

export function upsertPrimaryJourney(journeys: PrepJourney[], roadmap: RoadmapPlan) {
  const next = createPrepJourney(roadmap, "active", true, new Date().toISOString());
  return [
    next,
    ...journeys
      .filter((journey) => journey.id !== roadmap.id)
      .map((journey) => ({
        ...journey,
        isPrimary: false,
        status: journey.status === "active" ? "paused" as const : journey.status,
      })),
  ];
}

export function syncJourneyTasks(journeys: PrepJourney[], roadmapId: string, tasks: MissionTask[]) {
  return journeys.map((journey) => journey.id === roadmapId
    ? { ...journey, updatedAt: new Date().toISOString(), roadmap: { ...journey.roadmap, tasks } }
    : journey);
}

export function normalizePrepJourneys(journeys: PrepJourney[] | undefined, activeRoadmap?: RoadmapPlan) {
  const safeJourneys = (journeys ?? []).filter((journey) => journey?.roadmap?.id && journey.id);
  if (!activeRoadmap) return safeJourneys;
  const existing = safeJourneys.find((journey) => journey.id === activeRoadmap.id);
  const active = createPrepJourney(
    activeRoadmap,
    "active",
    true,
    existing?.updatedAt ?? activeRoadmap.createdAt,
    existing?.projectIds ?? [],
  );
  return [
    active,
    ...safeJourneys
      .filter((journey) => journey.id !== activeRoadmap.id)
      .map((journey) => ({ ...journey, isPrimary: false, status: journey.status === "active" ? "paused" as const : journey.status })),
  ];
}

export const samplePrepJourneys: PrepJourney[] = [
  createPrepJourney(samplePlan({
    id: "demo-iot-internship",
    request: "I want an IoT internship and can study 90 minutes per day for four months.",
    goal: "IoT Internship Preparation",
    track: "IoT",
    focus: "Build connected-device skills through ESP32, sensors, MQTT and tested project evidence.",
    targetDate: "2026-12-20",
    durationWeeks: 16,
    weeklyHours: 8,
    progress: [100, 72, 25, 0],
    sequence: ["Embedded + sensor foundation", "Connectivity + MQTT", "Reliable IoT project", "Portfolio + interviews"],
    tasks: [
      sampleTask("demo-iot-task-1", "ESP32 sensor reading", "build", "completed", 30, "Embedded Systems"),
      sampleTask("demo-iot-task-2", "MQTT publish and subscribe practice", "practice", "completed", 25, "MQTT"),
      sampleTask("demo-iot-task-3", "Document offline recovery behavior", "prove", "in_progress", 20, "IoT Reliability"),
      sampleTask("demo-iot-task-4", "Prepare an IoT project explanation", "assess", "pending", 15, "Interview Readiness"),
    ],
  }), "paused", false, "2026-09-12T09:30:00.000Z", ["project-iot"]),
  createPrepJourney(samplePlan({
    id: "demo-gate-foundation",
    request: "Strengthen shared GATE ECE and placement foundations without overload.",
    goal: "GATE ECE Foundation Sprint",
    track: "GATE + Placement",
    focus: "Reinforce high-overlap core subjects while preserving placement practice and evidence.",
    targetDate: "2026-08-30",
    durationWeeks: 12,
    weeklyHours: 7,
    progress: [100, 100, 100, 100],
    sequence: ["Network Theory", "Signals & Systems", "Communication Systems", "Revision proof"],
    tasks: [
      sampleTask("demo-gate-task-1", "Network Theory checkpoint", "assess", "completed", 25, "Network Theory"),
      sampleTask("demo-gate-task-2", "Signals revision sheet", "prove", "completed", 25, "Signals & Systems"),
      sampleTask("demo-gate-task-3", "Communication numericals", "practice", "completed", 30, "Communication Systems"),
    ],
  }), "completed", false, "2026-08-30T17:00:00.000Z"),
];

function samplePlan({ id, request, goal, track, focus, targetDate, durationWeeks, weeklyHours, progress, sequence, tasks }: {
  id: string;
  request: string;
  goal: string;
  track: string;
  focus: string;
  targetDate: string;
  durationWeeks: number;
  weeklyHours: number;
  progress: number[];
  sequence: string[];
  tasks: MissionTask[];
}): RoadmapPlan {
  const weeksPerMilestone = Math.max(1, Math.floor(durationWeeks / sequence.length));
  return {
    id,
    request,
    goal,
    track,
    focus,
    availableMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
    weeklyHours,
    difficulty: "Foundation-first",
    durationWeeks,
    durationLabel: durationWeeks % 4 === 0 ? `${durationWeeks / 4} months` : `${durationWeeks} weeks`,
    targetDate,
    createdAt: id.includes("iot") ? "2026-05-04T09:00:00.000Z" : "2026-06-08T09:00:00.000Z",
    adjusted: true,
    adjustmentMessage: "The journey was adjusted from completed work and the student's available weekly time.",
    nextStep: tasks.find((task) => task.status !== "completed")?.title ?? "Review completed evidence",
    milestones: sequence.map((title, index) => ({
      id: `${id}-milestone-${index + 1}`,
      title,
      detail: `Complete the ${title.toLowerCase()} phase and save evidence before moving forward.`,
      startWeek: index * weeksPerMilestone + 1,
      endWeek: index === sequence.length - 1 ? durationWeeks : (index + 1) * weeksPerMilestone,
      dueDate: targetDate,
      status: progress[index] === 100 ? "completed" : progress[index] > 0 ? "active" : index === 3 ? "locked" : "upcoming",
      progress: progress[index],
      skills: [title],
      completionCriteria: [`Complete the planned ${title.toLowerCase()} exercises.`, "Save one explainable evidence item."],
    })),
    tasks,
    allocation: [
      { label: "Learn", percent: 30 },
      { label: "Practice", percent: 25 },
      { label: "Build", percent: 30 },
      { label: "Assess & Prove", percent: 15 },
    ],
  };
}

function sampleTask(id: string, title: string, type: MissionTask["type"], status: MissionTask["status"], minutes: number, skill: string): MissionTask {
  return {
    id,
    title,
    detail: `Complete a focused ${title.toLowerCase()} session and record the result.`,
    minutes,
    type,
    status,
    skill,
    topics: [skill],
    priority: status === "in_progress" ? 5 : 4,
    completionCriteria: `Finish ${title.toLowerCase()} and save one evidence note.`,
    expectedOutcome: `Explain the result of ${title.toLowerCase()} clearly.`,
    scheduledFor: "2026-09-20",
    carryForwardCount: 0,
  };
}
