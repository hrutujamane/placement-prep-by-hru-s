"use client";

import { useRouter } from "next/navigation";
import { cloneElement, useState } from "react";
import type { ReactElement } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, GraduationCap, Sparkles, TimerReset } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { RequireAuth } from "@/components/app-shell";
import { Badge, Button, Input, Label, Progress, Select } from "@/components/ui";
import type { Profile } from "@/lib/types";

const goals = ["Placement", "Internship", "GATE", "Placement + GATE", "Higher studies", "Skill development", "Project development", "Not sure yet"];
const methods = ["Video", "Reading", "Practical", "Projects", "Mixed"];

export function OnboardingPage() {
  const router = useRouter();
  const { state, saveProfile } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Profile>({ ...state.profile, onboardingComplete: false });
  const [skillsText, setSkillsText] = useState(form.existingSkills.join(", "));
  const [rolesText, setRolesText] = useState(form.targetRoles.join(", "));
  const [companiesText, setCompaniesText] = useState(form.targetCompanies.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Profile>(key: K, value: Profile[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function next() { setStep((current) => Math.min(5, current + 1)); }
  function back() { setStep((current) => Math.max(1, current - 1)); }
  async function finish() {
    setSaving(true); setError("");
    try {
      await saveProfile({ ...form, existingSkills: splitValues(skillsText), targetRoles: splitValues(rolesText), targetCompanies: splitValues(companiesText), onboardingComplete: true });
      router.push(form.primaryGoal === "Not sure yet" ? "/career-discovery" : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be saved. Please retry.");
    } finally { setSaving(false); }
  }

  return <RequireAuth><main className="mesh-bg min-h-screen px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between"><BrandMark /><Badge tone="brand">Step {step} of 5</Badge></header>
    <div className="mt-7"><Progress value={step * 20} /></div>
    <section className="card mt-7 overflow-hidden"><div className="grid lg:grid-cols-[.72fr_1.28fr]">
      <aside className="hidden bg-[#111827] p-10 text-white lg:block"><div className="sticky top-10"><div className="grid size-12 place-items-center rounded-2xl bg-white/10">{step === 1 ? <GraduationCap /> : step === 2 ? <Compass /> : step === 3 ? <TimerReset /> : <Sparkles />}</div><h1 className="mt-8 text-3xl font-bold">{["Let’s start with you.", "What outcome matters most?", "Build a plan your week can sustain.", "How do you learn best?", "Give your mentor useful context."][step - 1]}</h1><p className="mt-4 text-sm leading-7 text-slate-300">{["These basics keep every recommendation relevant to your academic stage.", "You don’t need to know your career yet. Career Discovery is built for that.", "Realistic plans protect both momentum and deadlines.", "Your preferences shape resource format and cost.", "Existing skills, roles and companies are optional. Honest inputs create better plans."][step - 1]}</p></div></aside>
      <div className="p-6 sm:p-10 lg:p-12">
        {step === 1 && <div className="grid gap-5 sm:grid-cols-2"><Field label="Name"><Input value={form.name} onChange={(event) => update("name", event.target.value)} /></Field><Field label="College"><Input value={form.college} onChange={(event) => update("college", event.target.value)} /></Field><Field label="Branch"><Select value={form.branch} onChange={(event) => update("branch", event.target.value)}><option>Electronics & Telecommunication Engineering</option><option>Electronics & Communication Engineering</option><option>Electronics Engineering</option><option>Other engineering branch</option></Select></Field><Field label="Year"><Select value={form.year} onChange={(event) => update("year", event.target.value)}>{["First year", "Second year", "Third year", "Final year", "Graduate"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Semester"><Input value={form.semester} onChange={(event) => update("semester", event.target.value)} placeholder="Semester 6" /></Field></div>}
        {step === 2 && <div><fieldset><legend className="mb-2 block text-sm font-semibold">Primary goal</legend><div className="grid gap-3 sm:grid-cols-2">{goals.map((goal) => <button key={goal} onClick={() => update("primaryGoal", goal)} className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left text-sm font-semibold transition ${form.primaryGoal === goal ? "border-[var(--brand)] bg-violet-500/8 text-[var(--brand-strong)]" : "border-[var(--line)] hover:border-violet-500/40"}`}>{goal}{form.primaryGoal === goal && <Check className="size-4" />}</button>)}</div></fieldset><div className="mt-6"><Field label="Target completion date"><Input type="date" value={form.targetDate} onChange={(event) => update("targetDate", event.target.value)} /></Field></div></div>}
        {step === 3 && <div className="grid gap-5 sm:grid-cols-3"><Field label="Weekdays (hours/day)"><Input type="number" min="0" max="8" step="0.5" value={form.weekdayHours} onChange={(event) => update("weekdayHours", Number(event.target.value))} /></Field><Field label="Saturday (hours)"><Input type="number" min="0" max="12" step="0.5" value={form.saturdayHours} onChange={(event) => update("saturdayHours", Number(event.target.value))} /></Field><Field label="Sunday (hours)"><Input type="number" min="0" max="12" step="0.5" value={form.sundayHours} onChange={(event) => update("sundayHours", Number(event.target.value))} /></Field><div className="sm:col-span-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-[var(--muted)]"><strong className="text-[var(--foreground)]">Sustainable weekly capacity:</strong> {form.weekdayHours * 5 + form.saturdayHours + form.sundayHours} hours. Your roadmap will stay within this limit.</div></div>}
        {step === 4 && <div className="space-y-7"><fieldset><legend className="mb-2 block text-sm font-semibold">Preferred learning method</legend><div className="flex flex-wrap gap-2">{methods.map((method) => <button key={method} onClick={() => update("learningMethod", method)} className={`rounded-full border px-4 py-2 text-sm font-medium ${form.learningMethod === method ? "border-[var(--brand)] bg-violet-500/8 text-[var(--brand-strong)]" : "border-[var(--line)]"}`}>{method}</button>)}</div></fieldset><div className="grid gap-5 sm:grid-cols-2"><Field label="Course preference"><Select value={form.coursePreference} onChange={(event) => update("coursePreference", event.target.value)}><option>Free only</option><option>Paid courses allowed</option></Select></Field><Field label="Programming comfort"><Select value={form.programmingComfort} onChange={(event) => update("programmingComfort", event.target.value)}>{["None", "Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Electronics fundamentals"><Select value={form.electronicsLevel} onChange={(event) => update("electronicsLevel", event.target.value)}>{["None", "Beginner", "Intermediate", "Advanced"].map((value) => <option key={value}>{value}</option>)}</Select></Field></div></div>}
        {step === 5 && <div className="space-y-5"><Field label="Existing skills (comma separated)"><Input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="C, Digital Electronics, Arduino" /></Field><Field label="Target roles, if known"><Input value={rolesText} onChange={(event) => setRolesText(event.target.value)} placeholder="RF Engineer, Embedded Engineer" /></Field><Field label="Target companies, if known"><Input value={companiesText} onChange={(event) => setCompaniesText(event.target.value)} placeholder="Optional" /></Field><div className="rounded-2xl border border-[var(--line)] bg-slate-500/5 p-4 text-xs leading-5 text-[var(--muted)]">You can change every answer later. Recommendations explain their reasoning and are never presented as a scientific personality assessment.</div></div>}
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/8 p-3 text-sm text-rose-500">{error}</div>}
        <div className="mt-9 flex items-center justify-between"><Button variant="ghost" onClick={back} disabled={step === 1 || saving}><ArrowLeft className="size-4" />Back</Button>{step < 5 ? <Button onClick={next}>Continue <ArrowRight className="size-4" /></Button> : <Button onClick={() => void finish()} loading={saving}>Create my workspace <Sparkles className="size-4" /></Button>}</div>
      </div>
    </div></section>
  </div></main></RequireAuth>;
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = `onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  return <div><Label htmlFor={id}>{label}</Label>{cloneElement(children, { id })}</div>;
}
function splitValues(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
