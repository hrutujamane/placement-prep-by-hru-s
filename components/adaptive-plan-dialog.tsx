"use client";

import { useState } from "react";
import { AlertTriangle, CalendarClock, Check, RotateCcw, Sparkles, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Input, Label, Textarea } from "@/components/ui";
import { adjustmentReasons, createPlanAdjustment } from "@/lib/adaptive-planning";
import type { PlanAdjustment } from "@/lib/types";

export function AdaptivePlanDialog() {
  const { state, applyPlanAdjustment, undoPlanAdjustment } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(adjustmentReasons[0]);
  const [details, setDetails] = useState("");
  const [minutes, setMinutes] = useState(20);
  const [preview, setPreview] = useState<PlanAdjustment | null>(null);
  const latestApplied = state.planAdjustments.find((item) => item.status === "applied");

  function buildPreview() {
    const today = new Date().toISOString().slice(0, 10);
    setPreview(createPlanAdjustment(state.tasks, {
      reason: details.trim() ? `${reason} ${details.trim()}` : reason,
      availableMinutes: Math.max(0, minutes),
      today,
      targetDate: state.roadmap?.targetDate,
      usualDailyMinutes: state.roadmap?.availableMinutes ?? Math.max(15, Math.round(state.profile.weekdayHours * 60)),
    }));
  }

  function apply() {
    if (!preview) return;
    applyPlanAdjustment(preview);
    setOpen(false);
    setPreview(null);
  }

  return <>
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-orange-400/25 bg-orange-400/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-500/12 text-orange-500"><CalendarClock className="size-5" /></div><div><h2 className="font-bold">Today changed?</h2><p className="mt-1 text-sm text-[var(--muted)]">Rebuild only today&apos;s mission. Completed work stays protected and moved tasks remain visible.</p>{latestApplied && <p className="mt-2 text-xs text-[var(--muted)]">Latest: {latestApplied.changeSummary}</p>}</div></div>
      <div className="flex shrink-0 flex-wrap gap-2"><Button variant="secondary" onClick={() => setOpen(true)}>Today changed. Adjust my plan</Button>{latestApplied && <Button variant="ghost" onClick={() => undoPlanAdjustment(latestApplied.id)}><RotateCcw className="size-4" />Undo latest</Button>}</div>
    </section>

    {open && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><div className="mx-auto my-4 max-w-3xl rounded-[1.6rem] border border-[var(--line)] bg-[var(--background)] shadow-2xl"><header className="flex items-center justify-between border-b border-[var(--line)] p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">Adaptive daily planning</p><h2 className="mt-1 text-xl font-bold">What changed today?</h2></div><button className="rounded-xl border border-[var(--line)] p-2" onClick={() => setOpen(false)} aria-label="Close adjustment"><X className="size-5" /></button></header><div className="p-5 sm:p-6"><div className="grid gap-2 sm:grid-cols-2">{adjustmentReasons.map((item) => <button key={item} onClick={() => { setReason(item); if (item.includes("20 minutes")) setMinutes(20); setPreview(null); }} className={`rounded-xl border p-3 text-left text-sm font-medium ${reason === item ? "border-[var(--brand)] bg-violet-500/8 text-[var(--brand-strong)]" : "border-[var(--line)]"}`}>{item}</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-[.35fr_.65fr]"><div><Label>Available minutes today</Label><Input type="number" min="0" value={minutes} onChange={(event) => { setMinutes(Number(event.target.value)); setPreview(null); }} /></div><div><Label>Optional context</Label><Textarea value={details} onChange={(event) => { setDetails(event.target.value); setPreview(null); }} className="min-h-20" placeholder="Example: the servo is delayed, but I can use a simulator." /></div></div><Button className="mt-5 w-full" onClick={buildPreview}><Sparkles className="size-4" />Preview adjustment</Button>{preview && <div className="mt-6 rounded-2xl border border-violet-500/25 bg-violet-500/6 p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone="brand">Preview only</Badge><Badge>{preview.requestedMinutes} minute limit</Badge></div><h3 className="mt-4 font-bold">{preview.changeSummary}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><PreviewLine label="Why" value={preview.why} /><PreviewLine label="What moved" value={preview.movedTaskIds.length ? `${preview.movedTaskIds.length} unfinished task(s) move forward.` : "No task needs to move."} /></div><div className={`mt-4 rounded-xl p-3 text-sm ${preview.deadlineEffect.startsWith("Deadline risk") ? "bg-amber-500/12" : "bg-emerald-500/10"}`}><p className="flex items-center gap-2 font-semibold">{preview.deadlineEffect.startsWith("Deadline risk") ? <AlertTriangle className="size-4 text-amber-500" /> : <Check className="size-4 text-emerald-500" />}Deadline effect</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{preview.deadlineEffect}</p></div><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Change inputs</Button><Button onClick={apply}>Apply this adjustment <Check className="size-4" /></Button></div></div>}<p className="mt-5 text-xs leading-5 text-[var(--muted)]">No tasks are silently deleted. If the deadline becomes unrealistic, the preview says so and asks you to choose reduced scope, a later deadline or more study time.</p></div></div></div>}
  </>;
}

function PreviewLine({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--line)] p-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>; }
