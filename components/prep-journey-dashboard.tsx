"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, Check, CheckCircle2, Clock3, ExternalLink, FolderKanban, ListTodo, PauseCircle, Route, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, EmptyState, PageHeader, Progress } from "@/components/ui";
import { getLearningResourcesForMilestone } from "@/lib/learning-resources";
import { roadmapProgress, samplePrepJourneys } from "@/lib/prep-history";
import type { PrepJourneyStatus } from "@/lib/types";

const statusTone: Record<PrepJourneyStatus, "brand" | "warning" | "success" | "neutral"> = {
  active: "brand",
  paused: "warning",
  completed: "success",
  archived: "neutral",
};

export function PrepJourneyDashboard({ journeyId }: { journeyId: string }) {
  const { state, mockMode } = useApp();
  const journey = state.prepJourneys.find((item) => item.id === journeyId) ?? (mockMode ? samplePrepJourneys.find((item) => item.id === journeyId) : undefined);

  if (!journey) return <AppShell><EmptyState icon={<Route />} title="Journey not found" description="This preparation journey may have been removed or is not available in the current account." action={<Link href="/prep-history"><Button variant="secondary"><ArrowLeft className="size-4" />Back to Prep History</Button></Link>} /></AppShell>;

  const roadmap = journey.roadmap;
  const progress = roadmapProgress(roadmap);
  const completedTasks = roadmap.tasks.filter((task) => task.status === "completed");
  const queuedTasks = roadmap.tasks.filter((task) => !["completed", "skipped"].includes(task.status)).sort((a, b) => b.priority - a.priority);
  const currentMilestone = roadmap.milestones.find((milestone) => milestone.status === "active") ?? roadmap.milestones.find((milestone) => milestone.status !== "completed") ?? roadmap.milestones.at(-1);
  const resources = currentMilestone ? getLearningResourcesForMilestone(roadmap.track, currentMilestone) : [];
  const relatedProjects = state.projects.filter((project) => journey.projectIds.includes(project.id) || project.technologies.some((technology) => roadmap.track.toLowerCase().includes(technology.toLowerCase()) || technology.toLowerCase().includes(roadmap.track.toLowerCase())));

  return <AppShell>
    <div className="mb-5"><Link href="/prep-history" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft className="size-4" />Back to Prep History</Link></div>
    <PageHeader
      eyebrow="Preparation journey dashboard"
      title={journey.title}
      description={roadmap.focus}
      action={journey.isPrimary ? <Link href="/roadmap"><Button><Route className="size-4" />Open active roadmap</Button></Link> : <Badge tone={statusTone[journey.status]} className="self-start sm:self-auto">{journey.status} snapshot</Badge>}
    />

    <section className="mb-6 overflow-hidden rounded-[1.6rem] border border-violet-500/25 bg-gradient-to-br from-[#111820] via-[#5b3928] to-[#c98256] p-5 text-white shadow-xl shadow-violet-500/10 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><div className="flex flex-wrap gap-2"><Badge className="bg-white/12 text-white">{roadmap.track}</Badge>{journey.isPrimary && <Badge className="bg-white/12 text-white">Primary journey</Badge>}</div><h2 className="mt-5 text-2xl font-bold sm:text-3xl">{progress}% of the roadmap completed</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{completedTasks.length} of {roadmap.tasks.length} current mission tasks completed. The saved snapshot keeps milestones, task order and references connected to this goal.</p></div><div className="rounded-2xl border border-white/15 bg-black/15 p-5"><div className="mb-3 flex items-center justify-between text-sm"><span>Overall progress</span><strong>{progress}%</strong></div><Progress value={progress} className="bg-white/15" indicatorClassName="bg-white" /><p className="mt-4 text-xs leading-5 text-white/70">{roadmap.adjustmentMessage}</p></div></div>
    </section>

    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Summary icon={<Target />} label="Status" value={journey.status} detail={journey.isPrimary ? "Current primary goal" : "Saved for review"} />
      <Summary icon={<CalendarDays />} label="Target date" value={formatDate(roadmap.targetDate)} detail={`${roadmap.durationWeeks}-week pathway`} />
      <Summary icon={<Clock3 />} label="Study capacity" value={`${roadmap.weeklyHours} hours/week`} detail={`${roadmap.availableMinutes} minutes in this mission`} />
      <Summary icon={<CheckCircle2 />} label="Task evidence" value={`${completedTasks.length}/${roadmap.tasks.length} completed`} detail={`${queuedTasks.length} in the next-up queue`} />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
      <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Journey roadmap</p><h2 className="mt-1 text-xl font-bold">Milestone progress</h2></div><Route className="size-6 text-[var(--brand)]" /></div><div className="relative mt-6 space-y-3 before:absolute before:bottom-7 before:left-[17px] before:top-6 before:w-px before:bg-[var(--line)]">{roadmap.milestones.map((milestone, index) => <div key={milestone.id} className="relative flex gap-4 rounded-2xl border border-[var(--line)] bg-slate-500/[.025] p-3"><div className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ${milestone.status === "completed" ? "bg-emerald-500 text-white" : milestone.status === "active" ? "bg-[var(--brand)] text-white" : "border border-[var(--line)] bg-[var(--card)] text-[var(--muted)]"}`}>{milestone.status === "completed" ? <Check className="size-4" /> : index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{milestone.title}</h3><Badge tone={milestone.status === "completed" ? "success" : milestone.status === "active" ? "brand" : "neutral"}>{milestone.status}</Badge></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{milestone.detail}</p><div className="mt-3 flex items-center gap-3"><Progress value={milestone.progress} className="flex-1" /><span className="text-xs font-semibold">{milestone.progress}%</span></div></div></div>)}</div></div>

      <div className="space-y-6">
        <div className="card p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><ListTodo className="size-5" /></div><div><p className="text-xs text-[var(--muted)]">Next-up queue</p><h2 className="font-bold">What comes next</h2></div></div>{queuedTasks.length ? <div className="mt-5 space-y-3">{queuedTasks.slice(0, 5).map((task, index) => <div key={task.id} className="flex gap-3 rounded-xl border border-[var(--line)] p-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-bold text-[var(--brand-strong)]">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{task.type} · {task.minutes} minutes · {task.skill}</p></div>{task.status === "in_progress" && <Badge tone="brand">Doing</Badge>}</div>)}</div> : <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm text-emerald-600 dark:text-emerald-400">All tasks in this snapshot are complete.</div>}</div>

        <div className="card p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-amber-500/12 text-amber-500"><FolderKanban className="size-5" /></div><div><p className="text-xs text-[var(--muted)]">Connected evidence</p><h2 className="font-bold">Projects for this journey</h2></div></div>{relatedProjects.length ? <div className="mt-5 space-y-3">{relatedProjects.map((project) => <div key={project.id} className="rounded-xl border border-[var(--line)] p-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{project.name}</p><Badge tone={project.status === "Completed" ? "success" : "brand"}>{project.status}</Badge></div><p className="mt-2 text-xs text-[var(--muted)]">{project.nextMilestone}</p><Progress value={project.progress} className="mt-3" /></div>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-[var(--line)] p-4 text-sm leading-6 text-[var(--muted)]">No project is linked to this journey yet. A future project can be attached without changing the roadmap history.</p>}</div>
      </div>
    </section>

    <section className="mt-6 card p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Learning references</p><h2 className="mt-1 text-xl font-bold">Continue from the current milestone</h2><p className="mt-2 text-sm text-[var(--muted)]">Structured, free practical and optional paid sources stay attached to this journey.</p></div><BookOpenCheck className="size-6 text-[var(--brand)]" /></div>{currentMilestone && <p className="mt-5 text-sm font-semibold">Current focus: {currentMilestone.title}</p>}<div className="mt-4 grid gap-3 lg:grid-cols-3">{resources.map((resource) => <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-[var(--line)] p-4 transition hover:border-violet-500/40"><div className="flex items-start justify-between gap-3"><Badge tone="brand">{resource.provider}</Badge><ExternalLink className="size-4 text-[var(--muted)] group-hover:text-[var(--brand)]" /></div><h3 className="mt-4 text-sm font-bold">{resource.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{resource.cost} · {resource.duration} · {resource.language}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{resource.why}</p></a>)}</div></section>

    <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-slate-500/[.025] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{journey.status === "paused" ? <PauseCircle className="size-5 text-amber-500" /> : <Sparkles className="size-5 text-[var(--brand)]" />}<p className="text-sm text-[var(--muted)]"><strong className="text-[var(--foreground)]">History is non-destructive.</strong> Opening this dashboard does not replace the student&apos;s current primary plan.</p></div><Link href="/prep-history" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-strong)]">View all journeys <ArrowRight className="size-4" /></Link></section>
  </AppShell>;
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="card flex items-center gap-4 p-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)] [&_svg]:size-5">{icon}</div><div className="min-w-0"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 truncate font-bold capitalize">{value}</p><p className="mt-1 truncate text-xs text-[var(--muted)]">{detail}</p></div></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}
