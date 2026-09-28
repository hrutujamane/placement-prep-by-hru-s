import { z } from "zod";

export const roadmapTaskDraftSchema = z.object({
  title: z.string().min(3).max(120),
  minutes: z.number().int().min(5).max(240),
  type: z.enum(["learn", "practice", "assess", "build", "prove"]),
  skill: z.string().min(2).max(80),
  topics: z.array(z.string().min(2).max(80)).min(1).max(6),
  priority: z.number().int().min(1).max(5),
  completionCriteria: z.string().min(3).max(240),
  expectedOutcome: z.string().min(3).max(240),
});

export const roadmapDraftSchema = z.object({
  goal: z.string().min(3).max(180),
  focus: z.string().min(3).max(240),
  availableMinutes: z.number().int().min(5).max(720),
  difficulty: z.string().min(3).max(60),
  tasks: z.array(roadmapTaskDraftSchema).min(1).max(10),
  nextStep: z.string().min(3).max(240),
}).superRefine((value, context) => {
  const total = value.tasks.reduce((sum, task) => sum + task.minutes, 0);
  if (total > value.availableMinutes) {
    context.addIssue({ code: "custom", message: "Task duration exceeds available time", path: ["tasks"] });
  }
});

export type RoadmapDraft = z.infer<typeof roadmapDraftSchema>;

export const roadmapDraftJsonSchema = {
  type: "object",
  properties: {
    goal: { type: "string" },
    focus: { type: "string" },
    availableMinutes: { type: "integer", minimum: 5, maximum: 720 },
    difficulty: { type: "string" },
    tasks: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          minutes: { type: "integer", minimum: 5, maximum: 240 },
          type: { type: "string", enum: ["learn", "practice", "assess", "build", "prove"] },
          skill: { type: "string" },
          topics: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
          priority: { type: "integer", minimum: 1, maximum: 5 },
          completionCriteria: { type: "string" },
          expectedOutcome: { type: "string" },
        },
        required: ["title", "minutes", "type", "skill", "topics", "priority", "completionCriteria", "expectedOutcome"],
        additionalProperties: false,
      },
    },
    nextStep: { type: "string" },
  },
  required: ["goal", "focus", "availableMinutes", "difficulty", "tasks", "nextStep"],
  additionalProperties: false,
} as const;
