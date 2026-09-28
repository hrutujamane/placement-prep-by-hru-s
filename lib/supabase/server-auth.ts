import { createClient } from "@supabase/supabase-js";

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const mockMode = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES !== "false";
  if (mockMode && !authorization) return { id: "demo-user", email: "demo@placementprep.local" };

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !supabaseAnonKey) return null;

  const token = authorization.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}
