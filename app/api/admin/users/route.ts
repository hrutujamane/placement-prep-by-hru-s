import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { authenticateRequest } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(`admin-users:${getRequestIdentifier(request)}`, 30, 60_000);
  if (!limit.allowed) {
    return Response.json({ error: "Too many admin refreshes. Please retry shortly." }, { status: 429 });
  }

  const currentUser = await authenticateRequest(request);
  if (!currentUser) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });
  if (!isAdminEmail(currentUser.email)) return Response.json({ error: "This area is available only to the designated administrator." }, { status: 403 });

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Admin reporting needs a live Supabase connection and the server-only SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (error) return Response.json({ error: "Supabase could not load account records." }, { status: 502 });

  const users = data.users
    .map((user) => ({
      id: user.id,
      email: user.email ?? "No email available",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
      confirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
      displayName: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null,
    }))
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

  return Response.json({ users, fetchedAt: new Date().toISOString() }, {
    headers: { "Cache-Control": "private, no-store", "X-RateLimit-Remaining": String(limit.remaining) },
  });
}
