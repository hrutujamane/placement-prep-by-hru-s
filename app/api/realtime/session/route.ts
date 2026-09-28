import { createHash } from "node:crypto";
import OpenAI from "openai";
import { authenticateRequest } from "@/lib/supabase/server-auth";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { buildVoiceInterviewPrompts, liveInterviewSessionRequestSchema } from "@/lib/voice-interview";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const identifier = getRequestIdentifier(request);
  const limit = rateLimit(`voice:${identifier}`, 4, 60_000);
  if (!limit.allowed) return Response.json({ error: "Voice session limit reached. Please retry shortly.", retryAfter: limit.retryAfter }, { status: 429 });

  const user = await authenticateRequest(request);
  if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ error: "Live voice is not configured yet. Continue in text mode or ask the administrator to add the OpenAI API key.", code: "VOICE_NOT_CONFIGURED" }, { status: 503 });

  const parsed = liveInterviewSessionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "The voice session request was incomplete or invalid." }, { status: 400 });

  const safetyIdentifier = createHash("sha256").update(`${process.env.SAFETY_HASH_SALT ?? "pph"}:${user.id}`).digest("hex");
  const prompts = buildVoiceInterviewPrompts(parsed.data.interview);
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    defaultHeaders: { "OpenAI-Safety-Identifier": safetyIdentifier },
  });

  try {
    const result = await client.live.create({
      session: {
        model: process.env.OPENAI_LIVE_MODEL ?? "gpt-live-1",
        instructions: prompts.liveInstructions,
        input: [{
          type: "message",
          role: "developer",
          content: [{ type: "input_text", text: prompts.contextMessage }],
        }],
        audio: { output: { voice: process.env.OPENAI_LIVE_VOICE ?? "marin" } },
        delegation: {
          type: "responses",
          responses: {
            model: process.env.OPENAI_REASONING_MODEL ?? "gpt-6-astra",
            instructions: prompts.backendInstructions,
            reasoning: { effort: "medium" },
            text: { verbosity: "low" },
            max_output_tokens: 700,
            tool_choice: "none",
          },
        },
        client: {
          data_channel: {
            allowed_client_events: [
              "session.instructions.append",
              "session.input_audio.mute",
              "session.input_audio.unmute",
              "session.close",
            ],
          },
        },
        store: false,
      },
      transport: { type: "webrtc", sdp: parsed.data.sdp },
    });

    return Response.json({
      session: result.session,
      transport: result.transport,
      startInstruction: prompts.startInstruction,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof OpenAI.APIError && error.status === 429 ? 429 : 502;
    console.error("Live voice session failed", error instanceof OpenAI.APIError ? error.status : error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: status === 429 ? "The voice service is busy. Please retry shortly or continue in text mode." : "Voice connection failed. Please retry or continue in text mode." }, { status });
  }
}
