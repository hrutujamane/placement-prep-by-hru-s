import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { reportUpdateSchema } from "@/lib/student-reports";
import { authenticateRequest } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminClient(request: Request) {
  const currentUser = await authenticateRequest(request);
  if (!currentUser) return { error: Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 }) };
  if (!isAdminEmail(currentUser.email)) return { error: Response.json({ error: "This area is available only to the designated administrator." }, { status: 403 }) };
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return { error: Response.json({ error: "Admin reporting needs the server-only SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 }) };
  return { supabase: createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }) };
}

export async function GET(request: Request) {
  const limit = rateLimit(`admin-reports:${getRequestIdentifier(request)}`, 30, 60_000);
  if (!limit.allowed) return Response.json({ error: "Too many admin refreshes. Please retry shortly." }, { status: 429 });
  const result = await getAdminClient(request);
  if (result.error) return result.error;
  const { data, error } = await result.supabase.from("student_reports").select("id, user_id, category, message, page_path, status, admin_note, created_at, updated_at").order("created_at", { ascending: false }).limit(250);
  if (error) return Response.json({ error: "Student reports could not be loaded. Run the latest Supabase migration first." }, { status: 502 });
  const { data: users } = await result.supabase.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  const emails = new Map(users?.users.map((user) => [user.id, user.email ?? "Unknown student"]));
  return Response.json({ reports: data.map((report) => ({ id: report.id, email: emails.get(report.user_id) ?? "Unknown student", category: report.category, message: report.message, pagePath: report.page_path, status: report.status, adminNote: report.admin_note, createdAt: report.created_at, updatedAt: report.updated_at })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const result = await getAdminClient(request);
  if (result.error) return result.error;
  const parsed = reportUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please provide a valid report update." }, { status: 400 });
  const { error } = await result.supabase.from("student_reports").update({ status: parsed.data.status, admin_note: parsed.data.adminNote || null }).eq("id", parsed.data.id);
  if (error) return Response.json({ error: "The report update could not be saved." }, { status: 502 });
  return Response.json({ ok: true });
}
