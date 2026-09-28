"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, History, Layers3, ListTodo, PauseCircle, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, EmptyState, PageHeader, Progress } from "@/components/ui";
import { roadmapProgress, samplePrepJourneys } from "@/lib/prep-history";
import type { PrepJourneyStatus } from "@/lib/types";

const filters = ["all", "active", "paused", "completed"] as const;
const statusTone: Record<PrepJourneyStatus, "brand" | "warning" | "success" | "neutral"> = {
  active: "brand",
  paused: "warning",
  completed: "success",
  archived: "neutral",
};

export function PrepHistoryPage() {
  const { state, mockMode } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const availableJourneys = useMemo(() => mockMode
    ? [...state.prepJourneys, ...samplePrepJourneys.filter((sample) => !state.prepJourneys.some((journey) => journey.id === sample.id))]
    : state.prepJourneys, [mockMode, state.prepJourneys]);
  const journeys = useMemo(() => [...availableJourneys]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter((journey) => filter === "all" || journey.status === filter), [availableJourneys, filter]);
  const activeCount = availableJourneys.filter((journey) => journey.status === "active").length;
  const completedCount = availableJourneys.filter((journey) => journey.status === "completed").length;

  return <AppShell>
    <PageHeader
      eyebrow="Your saved preparation journeys"
      title="Prep History"
      description="Return to any goal without losing its roadmap, milestones, tasks, learning references or project context. Your primary journey stays separate from paused and completed plans."
      action={<Link href="/dashboard"><Button><Sparkles className="size-4" />Create a new journey</Button></Link>}
    />

    <section className="mb-6 grid gap-4 sm:grid-cols-3">
      <Summary icon={<Layers3 />} label="Saved journeys" value={String(availableJourneys.length)} detail="Open any plan at any time" />
      <Summary icon={<Target />} label="Primary journey" value={activeCount ? "Active" : "Not selected"} detail="One focused plan at a time" />
      <Summary icon={<CheckCircle2 />} label="Completed" value={String(completedCount)} detail="Progress preserved as evidence" />
    </section>

    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter preparation history">
      {filters.map((item) => <button key={item} onClick={() => setFilter(item)} aria-pressed={filter === item} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${filter === item ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)] bg-[var(--card)] text-[var(--muted)] hover:border-violet-500/40"}`}>{item}</button>)}
    </div>

    {journeys.length ? <section className="grid gap-5 xl:grid-cols-2">
      {journeys.map((journey, index) => {
        const roadmap = journey.roadmap;
        const progress = roadmapProgress(roadmap);
        const completedTasks = roadmap.tasks.filter((task) => task.status === "completed").length;
        const nextTasks = roadmap.tasks.filter((task) => !["completed", "skipped"].includes(task.status)).length;
        return <article key={journey.id} className={`card group relative overflow-hidden p-5 sm:p-6 ${journey.isPrimary ? "border-violet-500/40" : ""}`}>
          <div className="absolute right-5 top-5 text-5xl font-black text-violet-500/[.06]">{String(index + 1).padStart(2, "0")}</div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone[journey.status]}>{journey.status}</Badge>{journey.isPrimary && <Badge tone="brand">Primary</Badge>}<span className="text-xs text-[var(--muted)]">Updated {formatDate(journey.updatedAt)}</span></div>
            <h2 className="mt-4 max-w-[85%] text-xl font-bold">{journey.title}</h2>
            <p className="mt-1 text-sm font-semibold text-[var(--brand-strong)]">{roadmap.track}</p>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{roadmap.focus}</p>

            <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs"><span>Overall roadmap progress</span><strong>{progress}%</strong></div><Progress value={progress} /></div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={<CalendarDays />} label="Target" value={formatDate(roadmap.targetDate)} />
              <Stat icon={<Clock3 />} label="Weekly" value={`${roadmap.weeklyHours} hours`} />
              <Stat icon={<CheckCircle2 />} label="Completed" value={`${completedTasks}/${roadmap.tasks.length} tasks`} />
              <Stat icon={<ListTodo />} label="Queue" value={`${nextTasks} next`} />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-5">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">{journey.status === "paused" ? <PauseCircle className="size-4 text-amber-500" /> : journey.status === "completed" ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Target className="size-4 text-[var(--brand)]" />}{roadmap.durationWeeks}-week journey</div>
              <Link href={`/prep-history/${journey.id}`}><Button variant="secondary" size="sm">Open dashboard <ArrowRight className="size-4" /></Button></Link>
            </div>
          </div>
        </article>;
      })}
    </section> : <EmptyState icon={<History />} title="No journeys in this view" description="Choose another filter, or create a roadmap from the dashboard. Every new roadmap will appear here automatically." action={<Link href="/dashboard"><Button>Build a roadmap</Button></Link>} />}
  </AppShell>;
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="card flex items-center gap-4 p-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)] [&_svg]:size-5">{icon}</div><div><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--line)] bg-slate-500/[.025] p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]"><span className="text-[var(--brand)] [&_svg]:size-3.5">{icon}</span>{label}</div><p className="mt-2 truncate text-xs font-semibold">{value}</p></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
