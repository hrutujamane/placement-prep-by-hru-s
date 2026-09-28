"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, Check, ChevronRight, Circle, Clock3, ExternalLink, GitBranch, LockKeyhole, PlayCircle, RefreshCcw, Route, Save, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, PageHeader, Progress } from "@/components/ui";
import { getLearningResourcesForMilestone, type LearningResourceRecommendation } from "@/lib/learning-resources";
import { generateRoadmapFromGoal } from "@/lib/roadmap-engine";
import type { RoadmapMilestone } from "@/lib/types";

const stateTone = { "Not Started": "neutral", Learning: "brand", Practiced: "warning", Assessed: "success", "Project Completed": "success", Verified: "success" } as const;

export function RoadmapPage() {
  const { state, createRoadmap, retryRoadmapSync, persistenceError, persistenceStatus } = useApp();
  const fallbackRoadmap = useMemo(() => generateRoadmapFromGoal({
    prompt: "I want to become an RF and Radar Engineer in 8 months while preparing for GATE",
    profile: state.profile,
    skills: state.skills,
    previousTasks: state.tasks,
  }), [state.profile, state.skills, state.tasks]);
  const roadmap = state.roadmap ?? fallbackRoadmap;
  const [horizonSelection, setHorizonSelection] = useState<{ roadmapId: string; weeks: number } | null>(null);
  const [goalDraft, setGoalDraft] = useState<{ roadmapId: string; value: string } | null>(null);
  const goal = goalDraft?.roadmapId === roadmap.id ? goalDraft.value : roadmap.request;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const groups = Array.from(new Set(state.skills.map((skill) => skill.group)));
  const horizonWeeks = horizonSelection?.roadmapId === roadmap.id ? horizonSelection.weeks : roadmap.durationWeeks;
  const horizons = useMemo(() => buildHorizonOptions(roadmap.durationWeeks, roadmap.durationLabel), [roadmap.durationLabel, roadmap.durationWeeks]);
  const selectedHorizon = horizons.find((horizon) => horizon.weeks === horizonWeeks) ?? horizons.at(-1)!;
  const visibleMilestones = roadmap.milestones.filter((milestone) => milestone.startWeek <= selectedHorizon.weeks);
  const chartMilestones = visibleMilestones.length ? visibleMilestones : roadmap.milestones.slice(0, 1);
  const taskTotal = roadmap.tasks.reduce((sum, task) => sum + task.minutes, 0);

  async function regenerate(event: FormEvent) {
    event.preventDefault();
    if (!goal.trim()) return;
    setGenerating(true); setError("");
    try {
      const next = generateRoadmapFromGoal({ prompt: goal, profile: state.profile, skills: state.skills, previousTasks: state.tasks, previousRoadmap: state.roadmap });
      await createRoadmap(next);
      setGoalDraft({ roadmapId: next.id, value: next.request });
      setHorizonSelection({ roadmapId: next.id, weeks: next.durationWeeks });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The roadmap could not be generated. Please retry.");
    } finally { setGenerating(false); }
  }

  return <AppShell>
    <PageHeader eyebrow="Goal-generated roadmap" title={`${roadmap.track} pathway`} description={`${roadmap.focus} Built as a ${formatPlanLength(roadmap.durationLabel ?? formatDurationWeeks(roadmap.durationWeeks))} plan around ${roadmap.weeklyHours} sustainable hours per week, ending ${formatDate(roadmap.targetDate)}.`} action={<Link href="/dashboard"><Button><Target className="size-4" />Open today&apos;s mission</Button></Link>} />

    <form onSubmit={regenerate} className="card mb-6 overflow-hidden p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><label htmlFor="roadmap-goal" className="text-sm font-bold">What goal should this roadmap achieve?</label><textarea id="roadmap-goal" value={goal} onChange={(event) => setGoalDraft({ roadmapId: roadmap.id, value: event.target.value })} className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm leading-6 outline-none focus:border-[var(--brand)]" placeholder="Example: I want an embedded internship in 6 months and I have 90 minutes today." /><p className="mt-2 text-xs text-[var(--muted)]">Include a role, deadline, and today&apos;s available time. Existing progress is used automatically.</p></div>
        <Button size="lg" loading={generating}><RefreshCcw className="size-4" />Generate new roadmap</Button>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3 text-sm text-rose-500">{error}</div>}
      {persistenceStatus === "error" && <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{persistenceError}</span><Button type="button" size="sm" variant="secondary" onClick={() => void retryRoadmapSync()}>Retry save</Button></div>}
    </form>

    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Summary icon={<Clock3 />} label="Today&apos;s budget" value={`${roadmap.availableMinutes} minutes`} detail={`${roadmap.tasks.length} trackable tasks`} />
      <Summary icon={<CalendarDays />} label="Target date" value={formatDate(roadmap.targetDate)} detail={`${roadmap.durationLabel ?? formatDurationWeeks(roadmap.durationWeeks)} pathway`} />
      <Summary icon={<Target />} label="Current focus" value={roadmap.milestones[0]?.title ?? roadmap.focus} detail={roadmap.difficulty} />
      <Summary icon={<Save />} label="Progress" value={persistenceStatus === "saving" ? "Saving…" : "Saved"} detail={persistenceStatus === "error" ? "Retry available" : "Refresh-safe progress"} />
    </section>

    {roadmap.adjusted && <section className="mb-4 flex gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4"><RefreshCcw className="mt-0.5 size-5 shrink-0 text-emerald-500" /><div><p className="font-semibold">Your roadmap has been adjusted based on your progress.</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{roadmap.adjustmentMessage}</p></div></section>}
    {roadmap.bridgeMessage && <section className="mb-6 flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" /><div><p className="font-semibold">Foundation bridge included—you are not blocked.</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{roadmap.bridgeMessage}</p></div></section>}

    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Roadmap time horizon">{horizons.map((horizon) => <button key={`${horizon.label}-${horizon.weeks}`} onClick={() => setHorizonSelection({ roadmapId: roadmap.id, weeks: horizon.weeks })} aria-pressed={selectedHorizon.weeks === horizon.weeks} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${selectedHorizon.weeks === horizon.weeks ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"}`}>{horizon.label}</button>)}</div>

    <section className="card mb-6 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Personalized roadmap chart</p><h2 className="mt-1 text-xl font-bold">{selectedHorizon.label} milestone horizon</h2></div><Badge tone="brand"><Sparkles className="mr-1 size-3" />Generated from your goal</Badge></div>
      <div className="mt-7 overflow-x-auto pb-3">
        <div className="relative grid min-w-[720px] gap-4 pt-1" style={{ gridTemplateColumns: `repeat(${chartMilestones.length}, minmax(150px, 1fr))` }}>
          <div className="absolute left-[8%] right-[8%] top-[25px] h-1 rounded-full bg-slate-500/12"><div className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-emerald-400" style={{ width: `${Math.max(10, (chartMilestones.filter((item) => item.status === "completed").length / chartMilestones.length) * 100)}%` }} /></div>
          {chartMilestones.map((milestone, index) => <div key={milestone.id} className="relative z-10 text-center"><div className={`mx-auto grid size-12 place-items-center rounded-full border-4 border-[var(--card)] text-sm font-black shadow-lg ${milestone.status === "active" ? "roadmap-active-node bg-[var(--brand)] text-white" : milestone.status === "completed" ? "bg-emerald-500 text-white" : "bg-[var(--card)] text-[var(--muted)] ring-1 ring-[var(--line)]"}`}>{milestone.status === "completed" ? <Check className="size-5" /> : milestone.status === "locked" ? <LockKeyhole className="size-4" /> : index + 1}</div><div className={`mt-4 rounded-2xl border p-4 text-left transition duration-300 ${milestone.status === "active" ? "border-violet-500/35 bg-violet-500/7 shadow-lg shadow-violet-500/5" : "border-[var(--line)] bg-slate-500/[.025]"}`}><Badge tone={milestone.status === "active" ? "brand" : milestone.status === "completed" ? "success" : "neutral"}>{weekRange(milestone)}</Badge><h3 className="mt-3 text-sm font-bold">{milestone.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{milestone.detail}</p><Progress value={milestone.progress} className="mt-4" /><p className="mt-2 text-[11px] font-medium text-[var(--muted)]">Due {formatDate(milestone.dueDate)}</p></div></div>)}
        </div>
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.12fr_.88fr]">
      <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Milestone details</p><h2 className="mt-1 text-xl font-bold">What to complete and where to learn</h2><p className="mt-2 text-sm text-[var(--muted)]">Each phase includes one structured source, one free practical option and one optional paid path.</p></div><Route className="size-6 text-[var(--brand)]" /></div><div className="relative mt-6 space-y-3 before:absolute before:bottom-7 before:left-[17px] before:top-6 before:w-px before:bg-[var(--line)]">{chartMilestones.map((milestone, index) => <MilestoneRow key={milestone.id} milestone={milestone} index={index} track={roadmap.track} />)}</div><Link href="/resources" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-strong)]">Explore the full verified resource library <ArrowRight className="size-4" /></Link></div>

      <div className="space-y-6">
        <div className="card p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Time allocation</p><h2 className="mt-1 text-xl font-bold">How the plan balances work</h2><div className="mt-6 space-y-4">{roadmap.allocation.map((item) => <div key={item.label}><div className="mb-2 flex items-center justify-between text-sm"><span>{item.label}</span><strong>{item.percent}%</strong></div><Progress value={item.percent} indicatorClassName={item.label === "Build" ? "bg-amber-500" : item.label === "Assess & Prove" ? "bg-emerald-500" : undefined} /></div>)}</div></div>
        <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Today&apos;s mission</p><h2 className="mt-1 text-xl font-bold">Exactly {taskTotal} minutes</h2></div><Badge tone={taskTotal <= roadmap.availableMinutes ? "success" : "danger"}>{taskTotal <= roadmap.availableMinutes ? "Within budget" : "Needs adjustment"}</Badge></div><div className="mt-5 space-y-3">{roadmap.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-xs font-black text-[var(--brand-strong)]">{task.minutes}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{task.title}</p><p className="text-xs uppercase tracking-wide text-[var(--muted)]">{task.type} · {task.skill}</p></div></div>)}</div><Link href="/dashboard"><Button className="mt-5 w-full">Start mission <ArrowRight className="size-4" /></Button></Link></div>
      </div>
    </section>

    <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.82fr]">
      <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Visual skill tree</p><h2 className="mt-1 text-xl font-bold">Learn → Build → Prove</h2></div><GitBranch className="size-6 text-[var(--brand)]" /></div><div className="mt-6 grid gap-5 md:grid-cols-2">{groups.map((group) => <div key={group}><div className="mb-2 flex items-center gap-2"><div className="size-2 rounded-full bg-[var(--brand)]" /><h3 className="text-sm font-bold">{group}</h3></div><div className="ml-1 space-y-2 border-l border-[var(--line)] pl-4">{state.skills.filter((skill) => skill.group === group).map((skill) => <div key={skill.id} className="rounded-xl border border-[var(--line)] bg-slate-500/[.025] p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{skill.name}</p>{skill.prerequisite && <p className="mt-1 text-[11px] text-[var(--muted)]">Requires: {skill.prerequisite}</p>}</div><Badge tone={stateTone[skill.state]}>{skill.state}</Badge></div><div className="mt-3 flex items-center gap-3"><Progress value={skill.progress} className="flex-1" /><span className="text-xs font-semibold">{skill.progress}%</span></div>{skill.evidence && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-500"><Check className="size-3" />{skill.evidence}</p>}</div>)}</div></div>)}</div></div>
      <div className="card p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)]"><Target className="size-5" /></div><div><h2 className="font-bold">Verification ladder</h2><p className="text-sm text-[var(--muted)]">Progress requires evidence.</p></div></div><div className="mt-6 space-y-2">{["Learn", "Practice", "Quiz", "Mini task", "Project", "Evidence", "Portfolio"].map((item, index) => <div key={item} className="relative flex items-center gap-3 rounded-xl border border-[var(--line)] bg-slate-500/4 px-3 py-3 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-full bg-violet-500/10 text-xs text-[var(--brand-strong)]">{index + 1}</span>{item}{index < 6 && <ChevronRight className="ml-auto size-4 text-[var(--muted)]" />}</div>)}</div></div>
    </section>
  </AppShell>;
}

function MilestoneRow({ milestone, index, track }: { milestone: RoadmapMilestone; index: number; track: string }) {
  const resources = getLearningResourcesForMilestone(track, milestone);
  return <div className="relative flex gap-4 rounded-2xl border border-transparent p-3 hover:border-[var(--line)] hover:bg-slate-500/5"><div className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full border ${milestone.status === "active" ? "border-[var(--brand)] bg-[var(--brand)] text-white" : milestone.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"}`}>{milestone.status === "locked" ? <LockKeyhole className="size-4" /> : milestone.status === "completed" ? <Check className="size-4" /> : <Circle className="size-3" />}</div><div className="min-w-0 flex-1"><div className="grid gap-5 xl:grid-cols-[minmax(0,.82fr)_minmax(320px,1.18fr)]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{milestone.title}</p><Badge tone={milestone.status === "active" ? "brand" : milestone.status === "completed" ? "success" : "neutral"}>{weekRange(milestone)}</Badge></div><p className="mt-1 text-sm leading-5 text-[var(--muted)]">{milestone.detail}</p><div className="mt-3 flex flex-wrap gap-2">{milestone.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div><ul className="mt-3 space-y-1">{milestone.completionCriteria.map((criterion) => <li key={criterion} className="flex gap-2 text-xs text-[var(--muted)]"><Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />{criterion}</li>)}</ul>{index === 0 && <Progress value={milestone.progress} className="mt-3" />}</div><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]"><BookOpenCheck className="size-4" />Learn from</div><div className="grid gap-2">{resources.map((resource) => <LearningResourceLink key={resource.id} resource={resource} />)}</div></div></div></div></div>;
}

function LearningResourceLink({ resource }: { resource: LearningResourceRecommendation }) {
  const ProviderIcon = resource.provider === "YouTube" ? PlayCircle : BookOpenCheck;
  return <a href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open ${resource.title} on ${resource.provider}`} className="group rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 transition hover:border-violet-500/40 hover:shadow-md"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><ProviderIcon className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-strong)]">{resource.provider} · {resource.format}</p><p className="mt-0.5 text-sm font-semibold leading-5">{resource.title}</p></div><ExternalLink className="mt-0.5 size-4 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--brand)]" /></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{resource.cost} · {resource.level} · {resource.duration} · {resource.language}</p><p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{resource.why}</p><p className="mt-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{resource.verified}</p></div></div></a>;
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="card flex items-center gap-4 p-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)] [&_svg]:size-5">{icon}</div><div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 truncate font-bold">{value}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p></div></div>;
}

function weekRange(milestone: RoadmapMilestone) { return milestone.startWeek === milestone.endWeek ? `Week ${milestone.startWeek}` : `Weeks ${milestone.startWeek}–${milestone.endWeek}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); }
function buildHorizonOptions(durationWeeks: number, durationLabel?: string) {
  const standard = [
    { label: "1 day", weeks: 0 },
    { label: "7 days", weeks: 1 },
    { label: "30 days", weeks: 4 },
    { label: "3 months", weeks: 13 },
    { label: "6 months", weeks: 26 },
    { label: "1 year", weeks: 52 },
  ].filter((item) => item.weeks < durationWeeks);
  return [...standard, { label: durationLabel ?? formatDurationWeeks(durationWeeks), weeks: durationWeeks }];
}
function formatDurationWeeks(weeks: number) { return weeks % 52 === 0 ? `${weeks / 52} ${weeks === 52 ? "year" : "years"}` : weeks >= 13 && weeks % 13 === 0 ? `${weeks / 13 * 3} months` : `${weeks} ${weeks === 1 ? "week" : "weeks"}`; }
function formatPlanLength(label: string) { return label.replace(/^(\d+(?:\.\d+)?)\s+(day|week|month|year)s?$/i, "$1-$2"); }
