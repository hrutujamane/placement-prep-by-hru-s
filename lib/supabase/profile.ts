import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export async function saveProfileToSupabase(profile: Profile) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Your session expired. Please sign in again.");
  const { error } = await supabase.from("profiles").upsert({
    id: userData.user.id,
    name: profile.name,
    college: profile.college || null,
    branch: profile.branch || null,
    academic_year: profile.year || null,
    semester: profile.semester || null,
    weekday_hours: profile.weekdayHours,
    saturday_hours: profile.saturdayHours,
    sunday_hours: profile.sundayHours,
    learning_method: profile.learningMethod,
    course_preference: profile.coursePreference,
    programming_comfort: profile.programmingComfort,
    electronics_level: profile.electronicsLevel,
    onboarding_complete: profile.onboardingComplete,
  });
  if (error) throw new Error(error.message);
}

export async function loadProfileFromSupabase(fallback: Profile): Promise<Profile> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return fallback;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return fallback;
  const [{ data: profile, error: profileError }, { data: goal, error: goalError }] = await Promise.all([
    supabase.from("profiles").select("name, college, branch, academic_year, semester, weekday_hours, saturday_hours, sunday_hours, learning_method, course_preference, programming_comfort, electronics_level, onboarding_complete").eq("id", userData.user.id).maybeSingle(),
    supabase.from("career_goals").select("goal_type, target_role, target_company, target_date").eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (goalError) throw new Error(goalError.message);
  if (!profile) return { ...fallback, email: userData.user.email ?? fallback.email };
  return {
    ...fallback,
    name: profile.name,
    email: userData.user.email ?? fallback.email,
    college: profile.college ?? "",
    branch: profile.branch ?? fallback.branch,
    year: profile.academic_year ?? "",
    semester: profile.semester ?? "",
    weekdayHours: Number(profile.weekday_hours),
    saturdayHours: Number(profile.saturday_hours),
    sundayHours: Number(profile.sunday_hours),
    learningMethod: profile.learning_method,
    coursePreference: profile.course_preference,
    programmingComfort: profile.programming_comfort,
    electronicsLevel: profile.electronics_level,
    onboardingComplete: profile.onboarding_complete,
    primaryGoal: goal?.goal_type ?? fallback.primaryGoal,
    targetDate: goal?.target_date ?? fallback.targetDate,
    targetRoles: goal?.target_role ? [goal.target_role] : fallback.targetRoles,
    targetCompanies: goal?.target_company ? [goal.target_company] : fallback.targetCompanies,
  };
}
