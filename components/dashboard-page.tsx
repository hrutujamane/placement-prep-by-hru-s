"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Clock3,
  Flame,
  FolderKanban,
  Lightbulb,
  MessageSquareText,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdaptivePlanDialog } from "@/components/adaptive-plan-dialog";
import { useApp } from "@/components/app-provider";
import { Badge, Button, PageHeader, Progress, ScoreRing } from "@/components/ui";
import { calculateInterviewReadiness, calculatePlacementReadiness } from "@/lib/readiness";
import { getSkillVerification } from "@/lib/evidence";
import { applyAiRoadmapDraft, generateRoadmapFromGoal } from "@/lib/roadmap-engine";
import { interviewProgramDays } from "@/lib/interview-engine";
import { roadmapDraftSchema } from "@/lib/roadmap-schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";

const promptExamples = [
  "I am a beginner and want an embedded systems internship in 6 months. I can study 90 minutes per day.",
  "Prepare me for an RF engineering role in 8 months with 10 hours per week.",
  "Help me build an ESP32 project in 12 weeks. I know basic C and have 1 hour daily.",
  "Balance GATE and placements for 6 months with 2 hours per day.",
];

export function DashboardPage() {
  const router = useRouter();
  const { state, updateTask, createRoadmap, retryRoadmapSync, mockMode, persistenceStatus, persistenceError } = useApp();
  const [prompt, setPrompt] = useState("");
  const [mentorAnswer, setMentorAnswer] = useState("");
  const [planning, setPlanning] = useState(false);
  const [timerTask, setTimerTask] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const readiness = calculatePlacementReadiness(state);
  const interviewReadiness = calculateInterviewReadiness(state);
  const completedMinutes = state.tasks.filter((task) => task.status === "completed").reduce((total, task) => total + task.minutes, 0);
  const totalMinutes = state.tasks.reduce((total, task) => total + task.minutes, 0);
  const missionProgress = Math.round((completedMinutes / totalMinutes) * 100) || 0;
  const activeMilestone = state.roadmap?.milestones.find((milestone) => milestone.status === "active");
  const nextTask = state.tasks.find((task) => task.status !== "completed" && task.status !== "skipped");
  const priorityFocus = activeMilestone?.skills[0] ?? nextTask?.skill ?? "Complete a baseline assessment";
  const priorityContext = activeMilestone
    ? `Current roadmap phase: ${activeMilestone.title}`
    : nextTask
      ? `Needed for today's mission: ${nextTask.title}`
      : "Create a roadmap to identify the most useful next skill.";
  const verifiedStrength = [...state.skills]
    .filter((skill) => getSkillVerification(skill, state.evidenceSubmissions).verified)
    .sort((first, second) => second.progress - first.progress)[0];
  const relevantProjects = findRelevantProjects(state.roadmap?.track, state.projects).slice(0, 2);
  const interviewDay = Math.max(1, Math.min(interviewProgramDays.length, state.interviewProgram.currentDay));
  const interviewTitle = interviewProgramDays[interviewDay - 1].title;

  useEffect(() => {
    if (!timerTask) return;
    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [timerTask]);

  async function askMentor(event: FormEvent) {
    event.preventDefault(); if (!prompt.trim()) return;
    setPlanning(true); setMentorAnswer("");
    try {
      let roadmap = generateRoadmapFromGoal({ prompt, profile: state.profile, skills: state.skills, previousTasks: state.tasks, previousRoadmap: state.roadmap });
      if (!mockMode) {
        try {
          const { data } = await createSupabaseBrowserClient()!.auth.getSession();
          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
            body: JSON.stringify({ type: "roadmap", prompt, profile: state.profile, context: { skills: state.skills, projects: state.projects, previousRoadmap: state.roadmap, previousTasks: state.tasks, availableMinutes: roadmap.availableMinutes } }),
          });
          if (response.ok) roadmap = applyAiRoadmapDraft(roadmap, roadmapDraftSchema.parse(await response.json()));
        } catch {
          setMentorAnswer("Live AI planning was unavailable, so the safe goal engine created a time-valid roadmap you can use now.");
        }
      }
      await createRoadmap(roadmap);
      router.push("/roadmap");
    } catch (error) {
      setMentorAnswer(error instanceof Error ? error.message : "Your roadmap could not be created. Your previous progress is safe—please retry.");
    } finally { setPlanning(false); }
  }

  function changeTaskStatus(id: string, status: Parameters<typeof updateTask>[1]) {
    if (timerTask === id && status !== "in_progress") {
      setTimerTask(null);
      setSeconds(0);
    }
    void updateTask(id, status);
  }

  function toggleTaskTimer(id: string, currentStatus: Parameters<typeof updateTask>[1]) {
    const nextStatus = currentStatus === "in_progress" ? "paused" : "in_progress";
    if (nextStatus === "in_progress") {
      if (timerTask && timerTask !== id) void updateTask(timerTask, "paused");
      setTimerTask(id);
      setSeconds(0);
    } else {
      setTimerTask(null);
      setSeconds(0);
    }
    void updateTask(id, nextStatus);
  }

  const firstName = state.profile.name.split(" ")[0];
  return <AppShell>
    <PageHeader eyebrow="Your career operating system" title={state.roadmap ? `Welcome back, ${firstName}.` : `What do you want to achieve, ${firstName}?`} description={state.roadmap ? "One focused mission at a time. Your roadmap protects the goal while adapting to real progress." : "Describe your target role, current level, deadline and available study time. We will turn it into a practical roadmap."} action={state.roadmap ? <Link href="/roadmap"><Button variant="secondary">View roadmap <ArrowRight className="size-4" /></Button></Link> : undefined} />

    <section className="relative mb-6 overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-gradient-to-br from-[#fffaf5] via-[#f3d8c4] to-[#dda172] p-5 text-[#2b1b12] shadow-xl shadow-[rgba(121,73,42,0.14)] dark:border-violet-500/20 dark:from-[#111820] dark:via-[#6f4029] dark:to-[#c98256] dark:text-white dark:shadow-2xl dark:shadow-violet-500/15 sm:p-7">
      <div className="absolute -right-20 -top-20 size-72 rounded-full border-[45px] border-white/5" />
      <div className="relative grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><Badge className="bg-white/65 text-[#5a321d] dark:bg-white/12 dark:text-white"><Sparkles className="mr-1 size-3" />Create my roadmap</Badge><h2 className="mt-4 text-2xl font-bold sm:text-3xl">Tell us where you want to go.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-[#5b4130] dark:text-violet-100">Your answer becomes a saved, time-bound roadmap with milestones, prerequisite bridges and an exact first-day mission.</p><div className="mt-5 grid gap-2 text-xs text-[#5b4130] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 dark:text-violet-50"><span className="rounded-xl border border-black/10 bg-white/38 px-3 py-2 dark:border-white/15 dark:bg-white/8"><strong className="block text-[#2b1b12] dark:text-white">1. Target</strong>Role or exam</span><span className="rounded-xl border border-black/10 bg-white/38 px-3 py-2 dark:border-white/15 dark:bg-white/8"><strong className="block text-[#2b1b12] dark:text-white">2. Starting point</strong>Current skills</span><span className="rounded-xl border border-black/10 bg-white/38 px-3 py-2 dark:border-white/15 dark:bg-white/8"><strong className="block text-[#2b1b12] dark:text-white">3. Constraints</strong>Deadline + study time</span></div></div><form onSubmit={askMentor}><div className="rounded-2xl bg-white p-2 shadow-xl"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-32 w-full resize-none rounded-xl px-3 py-2 text-sm text-slate-900 outline-none" placeholder="Example: I am a beginner and want an embedded systems internship in 6 months. I know basic C and can study 90 minutes per day." aria-label="Describe your career goal" required minLength={12} /><div className="flex items-center justify-between gap-3 px-1 pb-1"><span className="hidden text-xs text-slate-500 sm:block">{mockMode ? "Validated planning engine" : "AI planning + validated fallback"}</span><Button loading={planning}>Build my roadmap <Sparkles className="size-4" /></Button></div></div><p className="mt-3 text-xs font-semibold text-[#5b4130] dark:text-white/80">Try a complete example:</p><div className="mt-2 flex flex-wrap gap-2">{promptExamples.map((example, index) => <button type="button" key={example} onClick={() => setPrompt(example)} className="rounded-full border border-black/10 bg-white/38 px-3 py-1.5 text-xs text-[#5b4130] hover:bg-white/65 dark:border-white/15 dark:bg-white/8 dark:text-white/85 dark:hover:bg-white/15">Example {index + 1}</button>)}</div></form></div>
      {mentorAnswer && <div className="relative mt-5 rounded-2xl border border-black/10 bg-white/48 p-4 text-sm leading-6 text-[#2b1b12] dark:border-white/15 dark:bg-slate-950/18 dark:text-white"><div className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="size-4" />AI-generated recommendation</div>{mentorAnswer}</div>}
    </section>

    {persistenceStatus === "error" && <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm"><strong>Progress sync needs attention.</strong> {persistenceError}</p><Button size="sm" variant="secondary" onClick={() => void retryRoadmapSync()}>Retry sync</Button></section>}

    <AdaptivePlanDialog />

    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Target />} label="Current goal" value={state.roadmap?.goal ?? "RF / Radar Engineer"} detail={state.roadmap?.track ?? state.profile.primaryGoal} tone="violet" />
      <Metric icon={<Flame />} label="Current streak" value={`${state.streak} days`} detail="Sustainable consistency" tone="amber" />
      <Metric icon={<Clock3 />} label="Weekly study" value={formatMinutes(state.weeklyMinutes)} detail="71% of plan" tone="mint" />
      <Metric icon={<TrendingUp />} label="Career stage" value="Skill Building" detail="Next: Project evidence" tone="blue" />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--brand-strong)]">Today&apos;s Mission</p><h2 className="mt-1 text-xl font-bold">{state.roadmap ? `${state.roadmap.track} · ${state.roadmap.availableMinutes} minutes` : "RF foundation + GATE overlap"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{completedMinutes} of {totalMinutes} minutes completed · total never exceeds today&apos;s budget</p></div><div className="min-w-36"><div className="mb-2 flex items-center justify-between text-xs"><span>Progress</span><strong>{missionProgress}%</strong></div><Progress value={missionProgress} /></div></div>
        <div className="mt-5 divide-y divide-[var(--line)]">{state.tasks.map((task, index) => <div key={task.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <button onClick={() => changeTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")} className={`grid size-8 shrink-0 place-items-center self-start rounded-full border sm:self-auto ${task.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--line)] text-[var(--muted)]"}`} aria-label={task.status === "completed" ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>{task.status === "completed" ? <Check className="size-4" /> : index + 1}</button>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className={`font-semibold ${task.status === "completed" ? "text-[var(--muted)] line-through" : ""}`}>{task.title}</p><Badge tone={task.type === "build" ? "warning" : task.type === "assess" || task.type === "prove" ? "success" : "brand"}>{task.type.toUpperCase()}</Badge><Badge>{task.status.replace("_", " ")}</Badge></div><p className="mt-1 text-sm leading-5 text-[var(--muted)]">{task.detail}</p><p className="mt-1 text-xs text-[var(--muted)]">Done when: {task.completionCriteria}</p>{task.status === "rescheduled" && <p className="mt-1 text-xs font-semibold text-amber-500">Rescheduled for {task.scheduledFor}</p>}</div>
          <div className="flex flex-wrap items-center gap-1.5 pl-11 sm:max-w-72 sm:justify-end sm:pl-0"><span className="mr-1 text-xs font-bold text-[var(--muted)]">{task.minutes}m</span>{task.status === "completed" ? <Button size="sm" variant="ghost" onClick={() => changeTaskStatus(task.id, "pending")}><RotateCcw className="size-3.5" />Reopen</Button> : <><Button size="sm" variant={task.status === "in_progress" ? "secondary" : "primary"} onClick={() => toggleTaskTimer(task.id, task.status)}>{task.status === "in_progress" ? <CirclePause className="size-3.5" /> : <CirclePlay className="size-3.5" />}{task.status === "in_progress" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} Pause` : task.status === "paused" ? "Resume" : "Start"}</Button><Button size="sm" variant="secondary" onClick={() => changeTaskStatus(task.id, "completed")}><Check className="size-3.5" />Complete</Button><Button size="sm" variant="ghost" onClick={() => changeTaskStatus(task.id, "skipped")}>Skip</Button><Button size="sm" variant="ghost" onClick={() => changeTaskStatus(task.id, "rescheduled")}>Tomorrow</Button></>}</div>
        </div>)}</div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/7 p-4"><RefreshCcw className="size-5 shrink-0 text-emerald-500" /><p className="text-sm"><strong>Your roadmap adjusts kindly.</strong> Important unfinished tasks move forward while lower-priority work is reduced.</p></div>
      </div>

      <div className="space-y-6">
        <div className="card grid gap-6 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-1 2xl:grid-cols-2"><ScoreRing value={readiness.score} label="Placement Readiness" /><ScoreRing value={interviewReadiness} label="Interview Readiness" tone="mint" /></div>
        <div className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Roadmap project</p><h3 className="mt-1 font-bold">Relevant project evidence</h3></div><Link href="/projects" className="shrink-0 text-xs font-semibold text-[var(--brand-strong)]">All projects</Link></div>{relevantProjects.length > 0 ? <div className="mt-4 space-y-4">{relevantProjects.map((project) => <Link href="/projects" key={project.id} className="block rounded-2xl border border-[var(--line)] p-4 hover:border-violet-500/35"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><FolderKanban className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{project.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{project.status} · {project.progress}%</p></div><ChevronRight className="size-4 text-[var(--muted)]" /></div><Progress value={project.progress} className="mt-3" /></Link>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] p-5"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><FolderKanban className="size-4" /></div><div><p className="text-sm font-semibold">{state.roadmap ? `No project linked to ${state.roadmap.track}` : "No roadmap project yet"}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{state.roadmap ? "Build one focused project that proves the skills in your active roadmap." : "Create a roadmap first so the right project can be recommended."}</p></div></div><Link href="/projects"><Button className="mt-4 w-full" size="sm" variant="secondary">Create relevant project <ArrowRight className="size-3.5" /></Button></Link></div>}</div>
      </div>
    </section>

    <section className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="card p-5 sm:p-6 lg:col-span-2"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Progress insights</p><h3 className="mt-1 text-lg font-bold">What matters next</h3></div><p className="text-xs text-[var(--muted)]">Based on roadmap status and verified evidence</p></div><div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center gap-2 text-[var(--brand-strong)]"><Target className="size-4" /><span className="text-xs font-bold uppercase tracking-[.1em]">Priority focus</span></div><p className="mt-3 font-semibold">{priorityFocus}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{priorityContext}</p></div><div className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center gap-2 text-emerald-500"><ShieldCheck className="size-4" /><span className="text-xs font-bold uppercase tracking-[.1em]">Verified strength</span></div><p className="mt-3 font-semibold">{verifiedStrength?.name ?? "Not verified yet"}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{verifiedStrength ? `${getSkillVerification(verifiedStrength, state.evidenceSubmissions).method} · ${getSkillVerification(verifiedStrength, state.evidenceSubmissions).scope}` : "Requires an assessment plus authorized mentor-reviewed evidence for a stated scope."}</p></div><div className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center gap-2 text-amber-500"><Zap className="size-4" /><span className="text-xs font-bold uppercase tracking-[.1em]">Next action</span></div><p className="mt-3 font-semibold">{state.roadmap?.nextStep ?? nextTask?.title ?? "Create your first roadmap"}</p><Link href="/roadmap" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-strong)]">Open current plan <ArrowRight className="size-3.5" /></Link></div></div></div>
      <Link href="/interview" className="card group p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><MessageSquareText className="size-5" /></div><div><p className="text-xs text-[var(--muted)]">Interview confidence</p><h3 className="font-bold">Day {interviewDay} · {interviewTitle}</h3></div></div><div className="mt-5 flex items-center justify-between text-sm font-semibold text-[var(--brand-strong)]">{state.interviewProgram.status === "completed" ? "Practice a targeted session" : "Continue confidence journey"} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></div></Link>
    </section>
  </AppShell>;
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "violet" | "amber" | "mint" | "blue" }) {
  const tones = { violet: "bg-violet-500/10 text-violet-500", amber: "bg-amber-500/12 text-amber-500", mint: "bg-emerald-500/10 text-emerald-500", blue: "bg-sky-500/10 text-sky-500" };
  return <div className="card flex items-center gap-4 p-4"><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${tones[tone]} [&_svg]:size-5`}>{icon}</div><div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 truncate text-lg font-bold">{value}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p></div></div>;
}

function findRelevantProjects(track: string | undefined, projects: Project[]) {
  if (!track) return [];
  const keywordsByTrack: Record<string, string[]> = {
    telecommunication: ["telecom", "telecommunication", "communication", "network", "transmission"],
    iot: ["iot", "esp32", "mqtt", "sensor", "embedded"],
    embedded: ["embedded", "esp32", "microcontroller", "firmware", "c++"],
    radar: ["radar", "doppler", "dsp", "signal"],
    rf: ["rf", "radio", "antenna", "microwave", "radar", "sdr"],
    software: ["software", "web", "app", "frontend", "backend", "full stack"],
  };
  const normalizedTrack = track.toLowerCase();
  const matchingGroup = Object.entries(keywordsByTrack).find(([name]) => normalizedTrack.includes(name));
  const keywords = matchingGroup?.[1] ?? normalizedTrack.split(/\s+/).filter((word) => word.length > 2);

  return projects.filter((project) => {
    const projectText = [project.name, project.description, ...project.technologies, ...project.components].join(" ").toLowerCase();
    return keywords.some((keyword) => projectText.includes(keyword));
  });
}
