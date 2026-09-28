"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Boxes, Check, Cpu, Pencil, Plus, Save, Trash2, Wrench } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { matchProjectsToInventory } from "@/lib/project-guidance";
import type { EquipmentCategory, EquipmentItem, EquipmentStatus, ProjectTemplate } from "@/lib/types";

const emptyItem: Omit<EquipmentItem, "id"> = { name: "", model: "", quantity: 1, status: "working", category: "component", notes: "" };

export function EquipmentInventory({ onUseTemplate }: { onUseTemplate: (template: ProjectTemplate) => void }) {
  const { state, saveEquipment, removeEquipment, saveBuildPreferences } = useApp();
  const [form, setForm] = useState<Omit<EquipmentItem, "id"> & { id?: string }>(emptyItem);
  const [showForm, setShowForm] = useState(false);
  const [preferences, setPreferences] = useState(state.buildPreferences);
  const matches = useMemo(() => matchProjectsToInventory(state.equipment, preferences).slice(0, 3), [preferences, state.equipment]);

  function submitItem(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    saveEquipment({ ...form, name: form.name.trim(), model: form.model?.trim(), notes: form.notes?.trim(), quantity: Math.max(1, form.quantity) });
    setForm(emptyItem);
    setShowForm(false);
  }

  function edit(item: EquipmentItem) {
    setForm(item);
    setShowForm(true);
  }

  return <section className="mb-7 overflow-hidden rounded-[1.6rem] border border-orange-400/25 bg-gradient-to-br from-orange-400/12 via-[var(--card)] to-violet-500/8">
    <div className="border-b border-[var(--line)] p-5 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><Badge tone="warning"><Wrench className="mr-1.5 size-3.5" />Build with what I have</Badge><h2 className="mt-3 text-2xl font-bold">Start from real equipment, time and constraints.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Recommendations use only items marked working. Missing components, optional upgrades and unresolved power details stay visible.</p></div>
        <Button onClick={() => { setForm(emptyItem); setShowForm(true); }}><Plus className="size-4" />Add equipment</Button>
      </div>
    </div>

    <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <div className="flex items-center justify-between"><h3 className="font-bold">My inventory</h3><span className="text-xs text-[var(--muted)]">{state.equipment.length} records</span></div>
          <div className="mt-4 space-y-2">{state.equipment.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-500"><Cpu className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}{item.model ? ` · ${item.model}` : ""}</p><div className="mt-1 flex flex-wrap gap-1.5"><Badge tone={item.status === "working" ? "success" : item.status === "uncertain" ? "warning" : "danger"}>{item.status}</Badge><Badge>{item.category} · qty {item.quantity}</Badge></div></div><button onClick={() => edit(item)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-slate-500/10" aria-label={`Edit ${item.name}`}><Pencil className="size-4" /></button><button onClick={() => removeEquipment(item.id)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10" aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></button></div>)}{state.equipment.length === 0 && <p className="rounded-xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">Add the exact boards, modules, tools, supplies and software you can actually use.</p>}</div>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); saveBuildPreferences(preferences); }} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
          <h3 className="font-bold">Build constraints</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Budget"><Input type="number" min="0" value={preferences.budget ?? ""} onChange={(event) => setPreferences((current) => ({ ...current, budget: event.target.value ? Number(event.target.value) : undefined }))} /></Field><Field label="Currency"><Input value={preferences.currency} onChange={(event) => setPreferences((current) => ({ ...current, currency: event.target.value }))} /></Field><Field label="Minutes available today"><Input type="number" min="10" value={preferences.availableMinutes} onChange={(event) => setPreferences((current) => ({ ...current, availableMinutes: Number(event.target.value) }))} /></Field><Field label="Target role"><Input value={preferences.targetRole} onChange={(event) => setPreferences((current) => ({ ...current, targetRole: event.target.value }))} /></Field><Field label="Difficulty"><Select value={preferences.difficulty} onChange={(event) => setPreferences((current) => ({ ...current, difficulty: event.target.value as typeof current.difficulty }))}><option value="starter">Starter</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select></Field><Field label="Preferred mode"><Select value={preferences.mode} onChange={(event) => setPreferences((current) => ({ ...current, mode: event.target.value as typeof current.mode }))}><option value="either">Hardware or simulation</option><option value="hardware">Hardware</option><option value="simulation">Simulation</option></Select></Field></div>
          <Field label="Current knowledge" className="mt-3"><Textarea value={preferences.currentKnowledge} onChange={(event) => setPreferences((current) => ({ ...current, currentKnowledge: event.target.value }))} className="min-h-20" /></Field>
          <Button type="submit" variant="secondary" className="mt-3 w-full"><Save className="size-4" />Save constraints</Button>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Feasible reviewed projects</h3><p className="mt-1 text-xs text-[var(--muted)]">Matching is deterministic; no current prices or shopping links are invented.</p></div><Boxes className="size-5 text-[var(--brand)]" /></div>
        <div className="mt-4 space-y-4">{matches.map((match) => <article key={match.template.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge tone="success">Reviewed · rev {match.template.revision}</Badge><Badge>{match.template.mode}</Badge></div><h4 className="mt-3 text-lg font-bold">{match.template.title}</h4><p className="mt-1 text-xs text-[var(--muted)]">{match.template.careerRelevance}</p></div><strong className="text-xl text-[var(--brand-strong)]">{match.score}% fit</strong></div><p className="mt-3 rounded-xl bg-slate-500/6 px-3 py-2 text-xs leading-5 text-[var(--muted)]">{match.feasibilityNote}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><MatchList title="Already available" items={match.available.map((item) => item.name)} tone="success" /><MatchList title="Required missing" items={match.missing.map((item) => item.name)} tone={match.missing.length ? "danger" : "success"} /><MatchList title="Optional upgrades" items={match.optionalUpgrades.map((item) => item.name)} tone="warning" /></div>{match.safetyQuestions.length > 0 && <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/8 p-3"><p className="flex items-center gap-2 text-xs font-bold"><AlertTriangle className="size-4 text-amber-500" />Exact connections paused</p>{match.safetyQuestions.map((question) => <p key={question} className="mt-2 text-xs leading-5 text-[var(--muted)]">{question}</p>)}</div>}<Button className="mt-4 w-full" variant={match.missing.length === 0 ? "primary" : "secondary"} onClick={() => onUseTemplate(match.template)}>{match.missing.length === 0 ? "Use this reviewed template" : match.template.mode === "hardware" ? "Open preparation plan" : "Review missing setup"}<Check className="size-4" /></Button></article>)}</div>
      </div>
    </div>

    {showForm && <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><form onSubmit={submitItem} className="w-full max-w-xl rounded-[1.5rem] border border-[var(--line)] bg-[var(--background)] p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">Equipment record</p><h2 className="mt-1 text-xl font-bold">{form.id ? "Edit equipment" : "Add what you have"}</h2></div><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Close</Button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Component or tool name"><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Arduino Uno" /></Field><Field label="Exact model, if known"><Input value={form.model ?? ""} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} placeholder="Uno R3 compatible" /></Field><Field label="Quantity"><Input type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} required /></Field><Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EquipmentStatus }))}><option value="working">Working</option><option value="uncertain">Uncertain</option><option value="unavailable">Unavailable</option></Select></Field><Field label="Category"><Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as EquipmentCategory }))}><option value="component">Component</option><option value="tool">Tool</option><option value="power">Power supply</option><option value="software">Software/simulation</option></Select></Field></div><Field label="Optional notes" className="mt-4"><Textarea value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-20" /></Field><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit">Save equipment</Button></div></form></div>}
  </section>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label}</Label>{children}</div>; }

function MatchList({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "danger" }) {
  return <div><p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--muted)]">{title}</p><div className="mt-2 flex flex-wrap gap-1.5">{items.length > 0 ? items.map((item) => <Badge key={item} tone={tone}>{item}</Badge>) : <span className="text-xs text-[var(--muted)]">None</span>}</div></div>;
}
