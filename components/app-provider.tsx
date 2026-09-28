"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { initialDemoState } from "@/lib/demo-data";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { loadProfileFromSupabase, saveProfileToSupabase } from "@/lib/supabase/profile";
import { loadActiveRoadmapFromSupabase, loadRoadmapHistoryFromSupabase, saveRoadmapToSupabase, updateTaskStatusInSupabase } from "@/lib/supabase/roadmap";
import { loadInterviewProgressFromSupabase, saveInterviewSessionToSupabase } from "@/lib/supabase/interview";
import { loadResumeReviewsFromSupabase, saveResumeReviewToSupabase } from "@/lib/supabase/resume";
import { advanceInterviewProgram, createInitialInterviewProgram } from "@/lib/interview-engine";
import { normalizePrepJourneys, syncJourneyTasks, upsertPrimaryJourney } from "@/lib/prep-history";
import type { BuildPreferences, DemoState, EquipmentItem, EvidenceSubmission, InterviewSessionRecord, JobApplication, PlanAdjustment, Profile, Project, ResumeReview, RoadmapPlan, RoleExplorationAttempt, TaskStatus } from "@/lib/types";
import { uid } from "@/lib/utils";
import { isAdminEmail } from "@/lib/admin";

const STORAGE_KEY = "placement-prep-by-hrus-state-v1";
const SESSION_KEY = "placement-prep-by-hrus-session-v1";
const THEME_KEY = "pph-theme-v2";

interface AppContextValue {
  state: DemoState;
  authenticated: boolean;
  loading: boolean;
  mockMode: boolean;
  isAdmin: boolean;
  theme: "light" | "dark";
  persistenceStatus: "saved" | "saving" | "error";
  persistenceError: string;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  continueDemo: () => void;
  logout: () => Promise<void>;
  saveProfile: (profile: Partial<Profile>) => Promise<void>;
  createRoadmap: (roadmap: RoadmapPlan) => Promise<void>;
  updateTask: (id: string, status: TaskStatus, scheduledFor?: string) => Promise<void>;
  retryRoadmapSync: () => Promise<void>;
  addProject: (project: Omit<Project, "id" | "progress">) => void;
  saveEquipment: (item: Omit<EquipmentItem, "id"> & { id?: string }) => void;
  removeEquipment: (id: string) => void;
  saveBuildPreferences: (preferences: Partial<BuildPreferences>) => void;
  applyPlanAdjustment: (adjustment: PlanAdjustment) => void;
  undoPlanAdjustment: (id: string) => void;
  submitEvidence: (evidence: Omit<EvidenceSubmission, "id" | "submittedAt" | "status" | "reviewMethod" | "simulated">) => boolean;
  recordCareerExploration: (attempt: Omit<RoleExplorationAttempt, "id" | "completedAt">) => void;
  addJob: (job: Omit<JobApplication, "id">) => void;
  updateJob: (id: string, status: JobApplication["status"]) => void;
  saveResumeReview: (review: Omit<ResumeReview, "id" | "createdAt">) => Promise<void>;
  recordQuiz: (score: number) => void;
  completeInterviewSession: (session: Omit<InterviewSessionRecord, "id" | "completedAt" | "passed">) => Promise<void>;
  toggleTheme: () => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DemoState>(initialDemoState);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [persistenceStatus, setPersistenceStatus] = useState<"saved" | "saving" | "error">("saved");
  const [persistenceError, setPersistenceError] = useState("");
  const mockMode = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES !== "false" || !isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      const storedState = window.localStorage.getItem(STORAGE_KEY);
      const storedSession = window.localStorage.getItem(SESSION_KEY);
      const storedTheme = window.localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
      let nextState = initialDemoState;
      if (storedState) {
        try { nextState = normalizeStoredState(JSON.parse(storedState) as DemoState); }
        catch { window.localStorage.removeItem(STORAGE_KEY); }
      }
      let sessionActive = storedSession === "active";
      if (!mockMode) {
        try {
          const supabase = createSupabaseBrowserClient();
          const { data } = await supabase!.auth.getSession();
          sessionActive = Boolean(data.session);
          setCurrentUserEmail(data.session?.user.email ?? null);
          if (data.session) {
            const [profile, roadmap, prepJourneys, interview, resumeReviews] = await Promise.all([loadProfileFromSupabase(nextState.profile), loadActiveRoadmapFromSupabase(), loadRoadmapHistoryFromSupabase(), loadInterviewProgressFromSupabase(), loadResumeReviewsFromSupabase()]);
            nextState = {
              ...nextState,
              profile,
              roadmap: roadmap ?? nextState.roadmap,
              tasks: roadmap?.tasks ?? nextState.tasks,
              prepJourneys: normalizePrepJourneys(prepJourneys, roadmap ?? undefined),
              interviewProgram: interview?.program ?? createInitialInterviewProgram(),
              interviewSessions: interview?.sessions ?? [],
              confidenceScores: interview?.confidenceScores ?? [],
              resumeReviews,
            };
          }
        } catch (error) {
          setPersistenceStatus("error");
          setPersistenceError(error instanceof Error ? error.message : "Saved progress could not be loaded.");
        }
      }
      if (cancelled) return;
      setState(nextState);
      setAuthenticated(sessionActive);
      if (storedTheme) setTheme(storedTheme);
      setLoading(false);
    }
    void initialize();
    return () => { cancelled = true; };
  }, [mockMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const persist = useCallback((updater: (current: DemoState) => DemoState) => {
    setState((current) => {
      const next = updater(current);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const activateSession = useCallback(() => {
    window.localStorage.setItem(SESSION_KEY, "active");
    setAuthenticated(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || password.length < 6) throw new Error("Enter a valid email and a password of at least 6 characters.");
    if (!mockMode) {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setCurrentUserEmail(data.user?.email ?? null);
    }
    activateSession();
    router.push("/dashboard");
  }, [activateSession, mockMode, router]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim()) throw new Error("Please enter your name.");
    if (!email || password.length < 8) throw new Error("Use a valid email and at least 8 characters for the password.");
    if (!mockMode) {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw error;
      setCurrentUserEmail(data.user?.email ?? null);
    }
    persist((current) => ({ ...current, profile: { ...current.profile, name, email, onboardingComplete: false } }));
    activateSession();
    router.push("/onboarding");
  }, [activateSession, mockMode, persist, router]);

  const continueDemo = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoState));
    setState(initialDemoState);
    activateSession();
    router.push("/dashboard");
  }, [activateSession, router]);

  const logout = useCallback(async () => {
    if (!mockMode) await createSupabaseBrowserClient()?.auth.signOut();
    window.localStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    setCurrentUserEmail(null);
    router.push("/login");
  }, [mockMode, router]);

  const saveProfile = useCallback(async (profile: Partial<Profile>) => {
    const nextProfile = { ...state.profile, ...profile };
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      if (!mockMode) await saveProfileToSupabase(nextProfile);
      persist((current) => ({ ...current, profile: nextProfile }));
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "Profile changes could not be saved.");
      throw error;
    }
  }, [mockMode, persist, state.profile]);

  const createRoadmap = useCallback(async (roadmap: RoadmapPlan) => {
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      if (!mockMode) await saveRoadmapToSupabase(roadmap);
      persist((current) => ({
        ...current,
        roadmap,
        tasks: roadmap.tasks,
        prepJourneys: upsertPrimaryJourney(current.prepJourneys, roadmap),
        profile: { ...current.profile, targetRoles: [roadmap.track] },
      }));
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "The roadmap could not be saved. Please retry.");
      throw error;
    }
  }, [mockMode, persist]);

  const updateTask = useCallback(async (id: string, status: TaskStatus, scheduledFor?: string) => {
    const previousTask = state.tasks.find((task) => task.id === id);
    if (!previousTask) return;
    const nextDate = status === "rescheduled" ? scheduledFor ?? tomorrow() : previousTask.scheduledFor;
    const minuteDelta = status === "completed" && previousTask.status !== "completed" ? previousTask.minutes : status !== "completed" && previousTask.status === "completed" ? -previousTask.minutes : 0;
    persist((current) => {
      const tasks = current.tasks.map((task) => task.id === id ? { ...task, status, scheduledFor: nextDate } : task);
      return {
        ...current,
        tasks,
        roadmap: current.roadmap ? { ...current.roadmap, tasks } : current.roadmap,
        prepJourneys: current.roadmap ? syncJourneyTasks(current.prepJourneys, current.roadmap.id, tasks) : current.prepJourneys,
        weeklyMinutes: Math.max(0, current.weeklyMinutes + minuteDelta),
      };
    });
    if (mockMode) return;
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      await updateTaskStatusInSupabase(id, status, nextDate);
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "Task progress is saved locally but could not sync.");
    }
  }, [mockMode, persist, state.tasks]);

  const retryRoadmapSync = useCallback(async () => {
    if (mockMode || !state.roadmap) { setPersistenceStatus("saved"); setPersistenceError(""); return; }
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      await saveRoadmapToSupabase({ ...state.roadmap, tasks: state.tasks });
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "Sync failed. Please retry.");
    }
  }, [mockMode, state.roadmap, state.tasks]);

  const completeInterviewSession = useCallback(async (session: Omit<InterviewSessionRecord, "id" | "completedAt" | "passed">) => {
    const advancement = advanceInterviewProgram(state.interviewProgram, session);
    let savedSession: InterviewSessionRecord = {
      ...session,
      id: uid("interview"),
      completedAt: new Date().toISOString(),
      passed: advancement.passed,
    };
    let nextProgram = advancement.program;
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      if (!mockMode) {
        const remote = await saveInterviewSessionToSupabase(savedSession);
        savedSession = { ...savedSession, id: remote.sessionId, passed: remote.passed };
        nextProgram = { ...nextProgram, currentDay: remote.currentDay, status: remote.status };
      }
      persist((current) => ({
        ...current,
        interviewProgram: nextProgram,
        interviewSessions: [...current.interviewSessions, savedSession],
        confidenceScores: [...current.confidenceScores, savedSession.afterConfidence],
      }));
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "The interview session could not be saved. Please retry.");
      throw error;
    }
  }, [mockMode, persist, state.interviewProgram]);

  const applyPlanAdjustment = useCallback((adjustment: PlanAdjustment) => {
    persist((current) => ({
      ...current,
      tasks: adjustment.afterTasks,
      roadmap: current.roadmap ? { ...current.roadmap, tasks: adjustment.afterTasks, adjusted: true, adjustmentMessage: adjustment.changeSummary } : current.roadmap,
      prepJourneys: current.roadmap ? syncJourneyTasks(current.prepJourneys, current.roadmap.id, adjustment.afterTasks) : current.prepJourneys,
      planAdjustments: [adjustment, ...current.planAdjustments],
    }));
  }, [persist]);

  const undoPlanAdjustment = useCallback((id: string) => {
    persist((current) => {
      const adjustment = current.planAdjustments.find((item) => item.id === id && item.status === "applied");
      if (!adjustment) return current;
      const tasks = adjustment.beforeTasks.map((task) => ({ ...task }));
      return {
        ...current,
        tasks,
        roadmap: current.roadmap ? { ...current.roadmap, tasks, adjustmentMessage: "The latest daily adjustment was undone; the previous mission was restored." } : current.roadmap,
        prepJourneys: current.roadmap ? syncJourneyTasks(current.prepJourneys, current.roadmap.id, tasks) : current.prepJourneys,
        planAdjustments: current.planAdjustments.map((item) => item.id === id ? { ...item, status: "undone" as const, undoneAt: new Date().toISOString() } : item),
      };
    });
  }, [persist]);

  const submitEvidence = useCallback((evidence: Omit<EvidenceSubmission, "id" | "submittedAt" | "status" | "reviewMethod" | "simulated">) => {
    if (state.evidenceSubmissions.some((item) => item.fingerprint === evidence.fingerprint)) return false;
    persist((current) => ({
      ...current,
      evidenceSubmissions: [{
        ...evidence,
        id: uid("evidence"),
        submittedAt: new Date().toISOString(),
        status: "Submitted",
        reviewMethod: "none",
        simulated: false,
      }, ...current.evidenceSubmissions],
    }));
    return true;
  }, [persist, state.evidenceSubmissions]);

  const saveResumeReview = useCallback(async (review: Omit<ResumeReview, "id" | "createdAt">) => {
    let savedReview: ResumeReview = { ...review, id: uid("resume"), createdAt: new Date().toISOString() };
    setPersistenceStatus("saving"); setPersistenceError("");
    try {
      if (!mockMode) savedReview = await saveResumeReviewToSupabase(savedReview);
      persist((current) => ({ ...current, resumeReviews: [savedReview, ...current.resumeReviews] }));
      setPersistenceStatus("saved");
    } catch (error) {
      setPersistenceStatus("error");
      setPersistenceError(error instanceof Error ? error.message : "The resume review could not be saved.");
      throw error;
    }
  }, [mockMode, persist]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    authenticated,
    loading,
    mockMode,
    isAdmin: !mockMode && isAdminEmail(currentUserEmail),
    theme,
    persistenceStatus,
    persistenceError,
    login,
    signup,
    continueDemo,
    logout,
    saveProfile,
    createRoadmap,
    updateTask,
    retryRoadmapSync,
    addProject: (project) => persist((current) => ({ ...current, projects: [{ ...project, id: uid("project"), progress: 5 }, ...current.projects] })),
    saveEquipment: (item) => persist((current) => ({
      ...current,
      equipment: item.id
        ? current.equipment.map((existing) => existing.id === item.id ? { ...item, id: existing.id } : existing)
        : [{ ...item, id: uid("equipment") }, ...current.equipment],
    })),
    removeEquipment: (id) => persist((current) => ({ ...current, equipment: current.equipment.filter((item) => item.id !== id) })),
    saveBuildPreferences: (preferences) => persist((current) => ({ ...current, buildPreferences: { ...current.buildPreferences, ...preferences } })),
    applyPlanAdjustment,
    undoPlanAdjustment,
    submitEvidence,
    recordCareerExploration: (attempt) => persist((current) => ({ ...current, roleExplorationAttempts: [{ ...attempt, id: uid("exploration"), completedAt: new Date().toISOString() }, ...current.roleExplorationAttempts] })),
    addJob: (job) => persist((current) => ({ ...current, jobs: [{ ...job, id: uid("job") }, ...current.jobs] })),
    updateJob: (id, status) => persist((current) => ({ ...current, jobs: current.jobs.map((job) => job.id === id ? { ...job, status } : job) })),
    saveResumeReview,
    recordQuiz: (score) => persist((current) => ({ ...current, quizScores: [...current.quizScores, score] })),
    completeInterviewSession,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    resetDemo: () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDemoState));
      setState(initialDemoState);
    },
  }), [applyPlanAdjustment, authenticated, completeInterviewSession, continueDemo, createRoadmap, currentUserEmail, loading, login, logout, mockMode, persistenceError, persistenceStatus, persist, retryRoadmapSync, saveProfile, saveResumeReview, signup, state, submitEvidence, theme, undoPlanAdjustment, updateTask]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeStoredState(stored: DemoState): DemoState {
  const validTypes = new Set(["learn", "practice", "assess", "build", "prove"]);
  const tasks = (stored.tasks ?? []).map((task, index) => {
    const storedType = (task as unknown as { type?: string }).type;
    const type = storedType === "test" ? "assess" : validTypes.has(storedType ?? "") ? storedType : "learn";
    return {
      ...task,
      type,
      skill: task.skill ?? task.title,
      topics: task.topics ?? [task.title],
      priority: task.priority ?? Math.max(1, 5 - index),
      completionCriteria: task.completionCriteria ?? "Complete the task and save one evidence note.",
      expectedOutcome: task.expectedOutcome ?? "Create visible progress toward the active goal.",
      scheduledFor: task.scheduledFor ?? new Date().toISOString().slice(0, 10),
      carryForwardCount: task.carryForwardCount ?? 0,
    } as DemoState["tasks"][number];
  });
  return {
    ...stored,
    tasks,
    projects: (stored.projects ?? initialDemoState.projects).map((project) => {
      if (project.templateId || !/doppler.*radar|radar.*simulat/i.test(`${project.name} ${project.description}`)) return project;
      return { ...project, templateId: "template-radar-simulation", templateRevision: "1.0", mode: "simulation" as const };
    }),
    roadmap: stored.roadmap ? { ...stored.roadmap, tasks } : stored.roadmap,
    prepJourneys: normalizePrepJourneys(stored.prepJourneys ?? initialDemoState.prepJourneys, stored.roadmap ? { ...stored.roadmap, tasks } : undefined),
    interviewProgram: stored.interviewProgram ?? initialDemoState.interviewProgram,
    interviewSessions: stored.interviewSessions ?? initialDemoState.interviewSessions,
    confidenceScores: stored.confidenceScores ?? initialDemoState.confidenceScores,
    equipment: stored.equipment ?? initialDemoState.equipment,
    buildPreferences: { ...initialDemoState.buildPreferences, ...(stored.buildPreferences ?? {}) },
    evidenceSubmissions: stored.evidenceSubmissions ?? initialDemoState.evidenceSubmissions,
    planAdjustments: stored.planAdjustments ?? [],
    roleExplorationAttempts: stored.roleExplorationAttempts ?? initialDemoState.roleExplorationAttempts,
    resumeReviews: stored.resumeReviews ?? initialDemoState.resumeReviews,
  };
}
