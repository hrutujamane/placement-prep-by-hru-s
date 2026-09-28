import { createClient } from "@supabase/supabase-js";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { studentReportSchema } from "@/lib/student-reports";
import { authenticateRequest } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = rateLimit(`student-report:${getRequestIdentifier(request)}`, 8, 60 * 60_000);
  if (!limit.allowed) return Response.json({ error: "You have sent several reports recently. Please try again later." }, { status: 429 });
  const user = await authenticateRequest(request);
  if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });

  const parsed = studentReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check the report details." }, { status: 400 });
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !anonKey || !authorization) return Response.json({ error: "Issue reporting needs a live Supabase connection." }, { status: 503 });

  const supabase = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: authorization } } });
  const { error } = await supabase.from("student_reports").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    page_path: parsed.data.pagePath,
  });
  if (error) return Response.json({ error: "Your report could not be saved. Please retry." }, { status: 502 });
  return Response.json({ ok: true }, { status: 201 });
}
