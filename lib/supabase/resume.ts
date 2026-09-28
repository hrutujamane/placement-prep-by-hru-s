import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ResumeReview } from "@/lib/types";

export async function saveResumeReviewToSupabase(review: ResumeReview): Promise<ResumeReview> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session expired. Please sign in again.");

  const { data, error } = await supabase.from("resume_versions").insert({
    user_id: userData.user.id,
    target_role: review.role,
    target_company: review.company,
    job_application_id: isUuid(review.jobApplicationId) ? review.jobApplicationId : null,
    title: `${review.company} — ${review.role}`,
    content: { resumeText: review.resumeText, jobDescription: review.jobDescription },
    source_file_name: review.sourceFileName ?? null,
    analysis: {
      matchedKeywords: review.matchedKeywords,
      missingKeywords: review.missingKeywords,
      strengths: review.strengths,
      improvements: review.improvements,
      polishedLines: review.polishedLines,
      sectionChecks: review.sectionChecks,
      suggestedSavedFacts: review.suggestedSavedFacts,
      documentFormat: review.documentFormat,
    },
    role_alignment_score: review.score,
    review_status: review.status,
    analysis_source: review.analysisSource,
    is_current: true,
  }).select("id, created_at").single();
  if (error) throw new Error(error.message);
  return { ...review, id: data.id, createdAt: data.created_at };
}

export async function loadResumeReviewsFromSupabase(): Promise<ResumeReview[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("resume_versions")
    .select("id, created_at, target_role, target_company, job_application_id, source_file_name, content, analysis, role_alignment_score, review_status, analysis_source")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapResumeReview(row)).filter((review): review is ResumeReview => Boolean(review));
}

function mapResumeReview(row: Record<string, unknown>): ResumeReview | null {
  const content = asRecord(row.content);
  const analysis = asRecord(row.analysis);
  const status = row.review_status;
  const source = row.analysis_source;
  if (typeof row.id !== "string" || typeof row.created_at !== "string" || typeof row.target_role !== "string" || typeof row.target_company !== "string" || typeof row.role_alignment_score !== "number") return null;
  if (status !== "Needs revision" && status !== "Developing" && status !== "Ready for human review") return null;
  if (source !== "local" && source !== "ai") return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    company: row.target_company,
    role: row.target_role,
    jobApplicationId: typeof row.job_application_id === "string" ? row.job_application_id : undefined,
    sourceFileName: typeof row.source_file_name === "string" ? row.source_file_name : undefined,
    documentFormat: documentFormatValue(analysis.documentFormat),
    resumeText: stringValue(content.resumeText),
    jobDescription: stringValue(content.jobDescription),
    score: row.role_alignment_score,
    status,
    matchedKeywords: stringArray(analysis.matchedKeywords),
    missingKeywords: stringArray(analysis.missingKeywords),
    strengths: stringArray(analysis.strengths),
    improvements: improvementArray(analysis.improvements),
    polishedLines: stringArray(analysis.polishedLines),
    sectionChecks: sectionArray(analysis.sectionChecks),
    suggestedSavedFacts: stringArray(analysis.suggestedSavedFacts),
    analysisSource: source,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function improvementArray(value: unknown): ResumeReview["improvements"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = asRecord(item);
    if ((entry.priority !== "High" && entry.priority !== "Medium" && entry.priority !== "Low") || typeof entry.title !== "string" || typeof entry.detail !== "string") return [];
    return [{ priority: entry.priority, title: entry.title, detail: entry.detail }];
  });
}

function sectionArray(value: unknown): ResumeReview["sectionChecks"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = asRecord(item);
    if (typeof entry.name !== "string" || typeof entry.present !== "boolean" || typeof entry.detail !== "string") return [];
    return [{ name: entry.name, present: entry.present, detail: entry.detail }];
  });
}

function documentFormatValue(value: unknown): ResumeReview["documentFormat"] {
  const entry = asRecord(value);
  if (entry.fileType !== "pdf" && entry.fileType !== "docx" && entry.fileType !== "txt" && entry.fileType !== "md" && entry.fileType !== "png" && entry.fileType !== "jpg" && entry.fileType !== "jpeg" && entry.fileType !== "webp") return undefined;
  if (typeof entry.headingCount !== "number" || typeof entry.bulletCount !== "number" || typeof entry.linkCount !== "number" || typeof entry.tableCount !== "number") return undefined;
  return {
    fileType: entry.fileType,
    pageCount: typeof entry.pageCount === "number" ? entry.pageCount : undefined,
    ocrConfidence: typeof entry.ocrConfidence === "number" ? entry.ocrConfidence : undefined,
    headingCount: entry.headingCount,
    bulletCount: entry.bulletCount,
    linkCount: entry.linkCount,
    tableCount: entry.tableCount,
    notes: stringArray(entry.notes),
  };
}
