import OpenAI from "openai";
import { z } from "zod";
import { roadmapDraftJsonSchema, roadmapDraftSchema } from "@/lib/roadmap-schema";
import { interviewEvaluationJsonSchema, interviewEvaluationSchema } from "@/lib/interview-schema";
import { authenticateRequest } from "@/lib/supabase/server-auth";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const requestSchema = z.object({
  type: z.enum(["mentor", "roadmap", "project", "resume", "job_gap", "interview_feedback"]),
  prompt: z.string().min(2).max(8_000),
  profile: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const responseSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    next_action: { type: "string" },
    rationale: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          minutes: { type: "integer", minimum: 5, maximum: 240 },
          type: { type: "string", enum: ["learn", "practice", "assess", "build", "prove"] },
          completion_criteria: { type: "string" },
        },
        required: ["title", "minutes", "type", "completion_criteria"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "next_action", "rationale", "tasks", "warnings"],
  additionalProperties: false,
} as const;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export async function POST(request: Request) {
  const identifier = getRequestIdentifier(request);
  const limit = rateLimit(`ai:${identifier}`, 8, 60_000);
  if (!limit.allowed) return Response.json({ error: "Too many AI requests. Please retry shortly.", retryAfter: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const user = await authenticateRequest(request);
  if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });

  let parsed: z.infer<typeof requestSchema>;
  try { parsed = requestSchema.parse(await request.json()); }
  catch { return Response.json({ error: "The request was incomplete or invalid. Please review it and retry." }, { status: 400 }); }

  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "AI service is not configured. Demo guidance remains available.", code: "AI_NOT_CONFIGURED" }, { status: 503 });

  const cacheKey = JSON.stringify([user.id, parsed.type, parsed.prompt.trim().toLowerCase(), parsed.profile, parsed.context]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return Response.json(cached.value, { headers: { "X-AI-Cache": "HIT" } });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const outputSchema = parsed.type === "roadmap"
      ? roadmapDraftJsonSchema
      : parsed.type === "interview_feedback"
        ? interviewEvaluationJsonSchema
        : responseSchema;
    const schemaName = parsed.type === "roadmap" ? "student_roadmap" : parsed.type === "interview_feedback" ? "interview_evaluation" : "career_plan";
    const response = await client.responses.create({
      model: process.env.OPENAI_REASONING_MODEL ?? "gpt-6-astra",
      instructions: [
        "You are the planning engine for PLACEMENT PREP BY HRU'S, an AI Career Operating System for ENTC/ECE students in India.",
        "Give realistic, goal-connected next actions that fit the student's available time and prerequisites.",
        "For roadmap requests, task durations must never exceed availableMinutes. Use previous progress, avoid repeating completed work, and carry forward only important unfinished work.",
        "For interview feedback, score only the supplied answer. Do not infer tone, confidence, facial expression, experience, project results, or technical claims that are not present. Give concise, constructive, actionable feedback.",
        "Do not shame missed work. Carry forward only important tasks and reduce overload.",
        "Never invent achievements, skills, project outcomes, URLs, prices, ratings, deadlines, hiring processes, or current company information.",
        "Call recommendations AI-generated guidance and distinguish them from verified current information.",
      ].join(" "),
      input: JSON.stringify({ requestType: parsed.type, studentRequest: parsed.prompt, profile: parsed.profile, context: parsed.context }),
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema: outputSchema } },
      max_output_tokens: 1_800,
    });
    if (!response.output_text) throw new Error("Empty model output");
    const rawValue = JSON.parse(response.output_text) as unknown;
    const value = parsed.type === "roadmap"
      ? roadmapDraftSchema.parse(rawValue)
      : parsed.type === "interview_feedback"
        ? interviewEvaluationSchema.parse(rawValue)
        : rawValue;
    cache.set(cacheKey, { expiresAt: Date.now() + 15 * 60_000, value });
    return Response.json(value, { headers: { "X-AI-Cache": "MISS", "X-RateLimit-Remaining": String(limit.remaining) } });
  } catch (error) {
    console.error("AI request failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "The AI mentor could not create a plan right now. Your saved roadmap is safe; please retry." }, { status: 502 });
  }
}
