import { z } from "zod";

const scoreSchema = z.number().int().min(0).max(100);

export const interviewEvaluationSchema = z.object({
  scores: z.object({
    clarity: scoreSchema,
    relevance: scoreSchema,
    technicalAccuracy: scoreSchema,
    answerStructure: scoreSchema,
    communication: scoreSchema,
    completeness: scoreSchema,
    uncertaintyHandling: scoreSchema,
  }),
  didWell: z.string().min(5).max(600),
  improve: z.string().min(5).max(600),
  betterStructure: z.string().min(5).max(600),
  uncertaintyFeedback: z.string().min(5).max(600),
});

export type InterviewEvaluationOutput = z.infer<typeof interviewEvaluationSchema>;

export const interviewEvaluationJsonSchema = {
  type: "object",
  properties: {
    scores: {
      type: "object",
      properties: {
        clarity: { type: "integer", minimum: 0, maximum: 100 },
        relevance: { type: "integer", minimum: 0, maximum: 100 },
        technicalAccuracy: { type: "integer", minimum: 0, maximum: 100 },
        answerStructure: { type: "integer", minimum: 0, maximum: 100 },
        communication: { type: "integer", minimum: 0, maximum: 100 },
        completeness: { type: "integer", minimum: 0, maximum: 100 },
        uncertaintyHandling: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["clarity", "relevance", "technicalAccuracy", "answerStructure", "communication", "completeness", "uncertaintyHandling"],
      additionalProperties: false,
    },
    didWell: { type: "string" },
    improve: { type: "string" },
    betterStructure: { type: "string" },
    uncertaintyFeedback: { type: "string" },
  },
  required: ["scores", "didWell", "improve", "betterStructure", "uncertaintyFeedback"],
  additionalProperties: false,
} as const;
