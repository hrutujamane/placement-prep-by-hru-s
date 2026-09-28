import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InterviewProgramState, InterviewSessionRecord } from "@/lib/types";

interface SavedInterviewResult {
  sessionId: string;
  currentDay: number;
  status: "active" | "completed";
  passed: boolean;
}

export async function saveInterviewSessionToSupabase(session: InterviewSessionRecord): Promise<SavedInterviewResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("save_interview_session", { payload: session });
  if (error) throw new Error(error.message);
  const result = data as { session_id?: unknown; current_day?: unknown; program_status?: unknown; passed?: unknown } | null;
  if (!result || typeof result.session_id !== "string" || typeof result.current_day !== "number" || (result.program_status !== "active" && result.program_status !== "completed") || typeof result.passed !== "boolean") {
    throw new Error("The interview session was saved, but the response was invalid. Reload your progress before retrying.");
  }
  return { sessionId: result.session_id, currentDay: result.current_day, status: result.program_status, passed: result.passed };
}

export async function loadInterviewProgressFromSupabase(): Promise<{ program: InterviewProgramState; sessions: InterviewSessionRecord[]; confidenceScores: number[] } | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: program, error: programError } = await supabase
    .from("interview_programs")
    .select("current_day, total_days, status, configuration")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programError) throw new Error(programError.message);
  if (!program) return null;

  const { data: rows, error: sessionError } = await supabase
    .from("interview_sessions")
    .select("session_summary")
    .eq("status", "completed")
    .order("ended_at", { ascending: true });
  if (sessionError) throw new Error(sessionError.message);
  const sessions = (rows ?? [])
    .map((row) => row.session_summary as unknown)
    .filter(isInterviewSessionRecord);
  const configuration = asRecord(program.configuration);
  const completedDays = Array.from(new Set(sessions.filter((session) => session.passed).map((session) => session.programDay))).sort((a, b) => a - b);
  const repeatCount = typeof configuration.repeatCount === "number" ? configuration.repeatCount : 0;
  const lastAdjustmentMessage = typeof configuration.lastAdjustmentMessage === "string"
    ? configuration.lastAdjustmentMessage
    : "Your interview journey has been restored from saved progress.";
  return {
    program: {
      currentDay: program.current_day,
      totalDays: program.total_days,
      status: program.status === "completed" ? "completed" : "active",
      completedDays,
      repeatCount,
      lastAdjustmentMessage,
    },
    sessions,
    confidenceScores: sessions.map((session) => session.afterConfidence),
  };
}

function isInterviewSessionRecord(value: unknown): value is InterviewSessionRecord {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<InterviewSessionRecord>;
  return typeof session.id === "string"
    && typeof session.programDay === "number"
    && typeof session.programTitle === "string"
    && typeof session.question === "string"
    && typeof session.answer === "string"
    && typeof session.averageScore === "number"
    && typeof session.beforeConfidence === "number"
    && typeof session.afterConfidence === "number"
    && Boolean(session.evaluation?.scores);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
