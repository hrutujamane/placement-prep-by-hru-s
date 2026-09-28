"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle, Check, CheckCircle2, Clipboard, Clock3, ExternalLink, FileCheck2, FileText,
  GitBranch, History, LayoutTemplate, Link2, LoaderCircle, Search, ShieldCheck, Sparkles, Target, Upload, UserRound, XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, EmptyState, Input, Label, PageHeader, Progress, ScoreRing, Select, Textarea } from "@/components/ui";
import { getSkillVerification } from "@/lib/evidence";
import { analyzeResume, type ResumeReviewResult } from "@/lib/resume-review";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ResumeDocumentFormat, ResumeReview } from "@/lib/types";

type ResumeTab = "polisher" | "tracker" | "portfolio";

export function ResumePage() {
  const { state, saveResumeReview, persistenceError } = useApp();
  const defaultJob = state.jobs[0];
  const [tab, setTab] = useState<ResumeTab>("polisher");
  const [selectedJobId, setSelectedJobId] = useState(defaultJob?.id ?? "custom");
  const [company, setCompany] = useState(defaultJob?.company ?? "");
  const [role, setRole] = useState(defaultJob?.role ?? state.profile.targetRoles[0] ?? "");
  const [jobDescription, setJobDescription] = useState(defaultJob?.jobDescription ?? "");
  const [resume, setResume] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [documentFormat, setDocumentFormat] = useState<ResumeDocumentFormat | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [review, setReview] = useState<ResumeReviewResult | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifiedSkills = useMemo(() => state.skills.map((skill) => ({ skill, verification: getSkillVerification(skill, state.evidenceSubmissions) })).filter((item) => item.verification.verified), [state.evidenceSubmissions, state.skills]);
  const documentedFacts = useMemo(() => [
    ...state.skills.map((skill) => `${skill.name}: ${skill.group}, ${skill.state}${skill.evidence ? `; evidence: ${skill.evidence}` : ""}`),
    ...state.projects.flatMap((project) => [
      `${project.name}: ${project.description}`,
      `${project.name} technologies: ${project.technologies.join(", ")}`,
      `${project.name} status: ${project.status}; next milestone: ${project.nextMilestone}`,
    ]),
    ...state.evidenceSubmissions.map((evidence) => `${evidence.title}: ${evidence.content}${evidence.actualResult ? `; result: ${evidence.actualResult}` : ""}`),
  ], [state.evidenceSubmissions, state.projects, state.skills]);

  function selectJob(id: string) {
    setSelectedJobId(id);
    setReview(null);
    setSaved(false);
    if (id === "custom") return;
    const job = state.jobs.find((item) => item.id === id);
    if (!job) return;
    setCompany(job.company);
    setRole(job.role);
    setJobDescription(job.jobDescription ?? "");
  }

  async function uploadResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true); setError(""); setUploadWarnings([]); setReview(null); setSaved(false); setResume(""); setSourceFileName(""); setDocumentFormat(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const token = await getAccessToken();
      const response = await fetch("/api/resume/extract", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await response.json() as { text?: string; fileName?: string; warnings?: string[]; documentFormat?: ResumeDocumentFormat; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error ?? "The resume could not be read.");
      setResume(data.text);
      setSourceFileName(data.fileName ?? file.name);
      setDocumentFormat(data.documentFormat ?? null);
      setUploadWarnings(data.warnings ?? []);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The resume could not be read.");
    } finally {
      setUploading(false);
    }
  }

  function runReview(event: FormEvent) {
    event.preventDefault();
    setError(""); setSaved(false);
    if (!sourceFileName || resume.trim().length < 30) { setError("Upload a readable PDF, DOCX or resume image first."); return; }
    if (!company.trim() || !role.trim()) { setError("Add the target company and role."); return; }
    if (jobDescription.trim().length < 20) { setError("Paste the job description so the review can compare real role requirements."); return; }
    setReview(analyzeResume({
      resumeText: resume,
      company,
      role,
      jobDescription,
      jobApplicationId: selectedJobId === "custom" ? undefined : selectedJobId,
      sourceFileName: sourceFileName || undefined,
      documentFormat: documentFormat ?? undefined,
      documentedFacts,
    }));
  }

  async function saveReview() {
    if (!review || saved) return;
    setSaving(true); setError("");
    try {
      await saveResumeReview(review);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The review could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function openReview(savedReview: ResumeReview) {
    const { id: _id, createdAt: _createdAt, ...result } = savedReview;
    void _id; void _createdAt;
    setCompany(savedReview.company);
    setRole(savedReview.role);
    setJobDescription(savedReview.jobDescription);
    setResume(savedReview.resumeText);
    setSourceFileName(savedReview.sourceFileName ?? "");
    setDocumentFormat(savedReview.documentFormat ?? null);
    setSelectedJobId(savedReview.jobApplicationId ?? "custom");
    setReview(result);
    setSaved(true);
    setTab("polisher");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyPortfolio() {
    await navigator.clipboard.writeText(`${state.profile.name}\n${state.profile.targetRoles.join(", ")}\nProjects: ${state.projects.map((project) => project.name).join(", ")}`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyPolishedLines() {
    if (!review) return;
    await navigator.clipboard.writeText(review.polishedLines.map((line) => `• ${line}`).join("\n"));
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <AppShell>
    <PageHeader eyebrow="Resume tracker & polisher" title="Tailor your resume without inventing a story." description="Upload a resume, compare it with the job description you provide, improve truthful wording, and track each company-specific version." />
    <div className="mb-6 flex gap-2 overflow-x-auto">
      {[
        { key: "polisher", label: "Company Resume Polisher", icon: Sparkles },
        { key: "tracker", label: `Version Tracker${state.resumeReviews.length ? ` (${state.resumeReviews.length})` : ""}`, icon: History },
        { key: "portfolio", label: "Portfolio", icon: UserRound },
      ].map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key as ResumeTab)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tab === key ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--brand)]"}`}><Icon className="size-4" />{label}</button>)}
    </div>

    {tab === "polisher" && <section className="grid gap-6 xl:grid-cols-[.92fr_1.08fr]">
      <form onSubmit={runReview} className="card h-fit p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">1. Resume and target</h2><p className="mt-1 text-sm text-[var(--muted)]">Upload the original resume PDF/DOCX or a clear resume image. The app reads it privately in the background.</p></div><Badge tone="success">Private workflow</Badge></div>
        <div className="mt-5"><Label htmlFor="saved-job">Use a saved application</Label><Select id="saved-job" value={selectedJobId} onChange={(event) => selectJob(event.target.value)}><option value="custom">Custom company and role</option>{state.jobs.map((job) => <option key={job.id} value={job.id}>{job.company} — {job.role}</option>)}</Select></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="company">Company</Label><Input id="company" value={company} onChange={(event) => { setCompany(event.target.value); setSelectedJobId("custom"); setReview(null); setSaved(false); }} placeholder="Example: Bharat Electronics" /></div><div><Label htmlFor="role">Role</Label><Input id="role" value={role} onChange={(event) => { setRole(event.target.value); setSelectedJobId("custom"); setReview(null); setSaved(false); }} placeholder="Example: Graduate Engineer" /></div></div>
        <div className="mt-5"><Label>Upload resume</Label><label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-slate-500/[.03] px-5 text-center transition hover:border-[var(--brand)] hover:bg-violet-500/[.04]"><input className="sr-only" type="file" accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp" onChange={(event) => void uploadResume(event)} disabled={uploading} />{uploading ? <LoaderCircle className="size-7 animate-spin text-[var(--brand)]" /> : sourceFileName ? <FileCheck2 className="size-7 text-emerald-500" /> : <Upload className="size-7 text-[var(--brand)]" />}<span className="mt-2 text-sm font-semibold">{uploading ? "Reading the uploaded resume…" : sourceFileName || "Choose PDF, DOCX or resume image"}</span><span className="mt-1 text-xs text-[var(--muted)]">PNG, JPG and WebP supported · Maximum 5 MB</span><span className="mt-1 text-xs text-[var(--muted)]">Use a sharp, straight and well-lit image for accurate reading</span><span className="mt-2 text-xs font-semibold text-[var(--brand-strong)]">{sourceFileName ? "Choose another file" : "Browse files"}</span></label></div>
        {uploadWarnings.map((warning) => <p key={warning} className="mt-2 flex gap-2 rounded-xl bg-amber-500/8 px-3 py-2 text-xs leading-5 text-amber-600 dark:text-amber-300"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{warning}</p>)}
        {documentFormat && <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.04] p-4"><div className="flex items-center gap-2"><LayoutTemplate className="size-4 text-emerald-500" /><p className="text-sm font-semibold">Original resume read successfully</p></div><div className="mt-3 flex flex-wrap gap-2"><Badge tone="success">{documentFormat.fileType.toUpperCase()}</Badge>{documentFormat.pageCount && <Badge>{documentFormat.pageCount} page{documentFormat.pageCount === 1 ? "" : "s"}</Badge>}{documentFormat.ocrConfidence !== undefined && <Badge tone={documentFormat.ocrConfidence >= 75 ? "success" : "warning"}>{documentFormat.ocrConfidence}% OCR confidence</Badge>}<Badge>{documentFormat.headingCount} headings</Badge><Badge>{documentFormat.bulletCount} bullets</Badge><Badge>{documentFormat.linkCount} links</Badge></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">The resume wording is intentionally not displayed here. It is used only for this review and is saved only when you choose to save the review.</p></div>}
        <div className="mt-4"><Label htmlFor="job-description">Job description</Label><Textarea id="job-description" value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setReview(null); setSaved(false); }} className="min-h-44" placeholder="Paste the actual company job description here…" /></div>
        {(error || persistenceError) && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm text-rose-500">{error || persistenceError}</p>}
        <Button className="mt-5 w-full" size="lg" type="submit" disabled={uploading}><Search className="size-4" />Review for {company.trim() || "this company"}</Button>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">This is a transparent local comparison, not a scan by the company’s real ATS and not a prediction of selection.</p>
      </form>

      <div className="space-y-5">
        {!review ? <EmptyState icon={<Target className="size-6" />} title="Your targeted review will appear here" description="Upload the original resume and add the real job description. You will see role alignment, formatting checks, missing evidence and truthful wording suggestions." /> : <>
          <div className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><ScoreRing value={review.score} label="Role alignment" /><div className="sm:text-right"><Badge tone={review.status === "Ready for human review" ? "success" : review.status === "Developing" ? "warning" : "danger"}>{review.status}</Badge><p className="mt-2 text-xs text-[var(--muted)]">Local rubric · {review.company} · {review.role}</p></div></div>
            <Progress value={review.score} className="mt-5" />
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">The score combines visible resume sections, wording evidence and overlap with the supplied job description. It is not an external ATS score or hiring probability.</p>
            <Button className="mt-5 w-full" onClick={() => void saveReview()} loading={saving} disabled={saved}>{saved ? <><Check className="size-4" />Saved to version tracker</> : <><FileCheck2 className="size-4" />Save this review to tracker</>}</Button>
          </div>

          <div className="card p-5 sm:p-6"><h3 className="font-bold">What the resume already shows</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{review.strengths.map((strength) => <div key={strength} className="flex gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-3 text-xs leading-5"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />{strength}</div>)}</div></div>

          {review.documentFormat && <div className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><LayoutTemplate className="size-5 text-[var(--brand)]" /><h3 className="font-bold">Original file format check</h3></div>{review.documentFormat.ocrConfidence !== undefined && <Badge tone={review.documentFormat.ocrConfidence >= 75 ? "success" : "warning"}>{review.documentFormat.ocrConfidence}% OCR confidence</Badge>}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><FormatMetric label="Headings" value={review.documentFormat.headingCount} /><FormatMetric label="Bullets" value={review.documentFormat.bulletCount} /><FormatMetric label="Links" value={review.documentFormat.linkCount} /><FormatMetric label="Tables" value={review.documentFormat.tableCount} /></div><div className="mt-4 space-y-2">{review.documentFormat.notes.map((note) => <p key={note} className="text-xs leading-5 text-[var(--muted)]">• {note}</p>)}</div></div>}

          <div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><h3 className="font-bold">Section check</h3><span className="text-xs text-[var(--muted)]">{review.sectionChecks.filter((item) => item.present).length}/{review.sectionChecks.length} visible</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{review.sectionChecks.map((section) => <div key={section.name} className="flex gap-3 rounded-xl border border-[var(--line)] p-3">{section.present ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />}<div><p className="text-sm font-semibold">{section.name}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{section.detail}</p></div></div>)}</div></div>

          <div className="grid gap-5 md:grid-cols-2"><KeywordCard title="Matched role language" values={review.matchedKeywords} tone="success" empty="No strong matches detected yet." /><KeywordCard title="Missing from this resume" values={review.missingKeywords} tone="warning" empty="No major missing terms detected." /></div>

          <div className="card p-5 sm:p-6"><h3 className="font-bold">Priority improvements</h3><div className="mt-4 space-y-3">{review.improvements.map((item) => <div key={`${item.priority}-${item.title}`} className="flex gap-3 rounded-2xl border border-[var(--line)] p-4"><span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${item.priority === "High" ? "bg-rose-500" : item.priority === "Medium" ? "bg-amber-500" : "bg-sky-500"}`} /><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.title}</p><Badge tone={item.priority === "High" ? "danger" : item.priority === "Medium" ? "warning" : "neutral"}>{item.priority}</Badge></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.detail}</p></div></div>)}</div></div>

          {review.suggestedSavedFacts.length > 0 && <div className="card border-violet-500/20 p-5 sm:p-6"><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[var(--brand)]" /><h3 className="font-bold">Relevant facts already saved in your workspace</h3></div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">These are suggestions to verify and consider—not automatic claims added to your resume.</p><ul className="mt-4 space-y-2">{review.suggestedSavedFacts.map((fact) => <li key={fact} className="rounded-xl bg-violet-500/[.05] px-3 py-2 text-xs leading-5">{fact}</li>)}</ul></div>}

          <div className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><Badge tone="brand">Truth-preserving polish</Badge><h3 className="mt-2 font-bold">Cleaner wording from your text</h3></div>{review.polishedLines.length > 0 && <Button size="sm" variant="secondary" onClick={() => void copyPolishedLines()}><Clipboard className="size-4" />{copied ? "Copied" : "Copy"}</Button>}</div>{review.polishedLines.length > 0 ? <ul className="mt-4 space-y-3">{review.polishedLines.map((line) => <li key={line} className="rounded-xl border border-[var(--line)] p-3 text-sm leading-6">{line}</li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">Add a project or experience statement to receive wording suggestions.</p>}<p className="mt-4 flex gap-2 text-xs leading-5 text-[var(--muted)]"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />No metric, achievement, certification or company process is added unless it exists in the supplied text.</p></div>
        </>}
      </div>
    </section>}

    {tab === "tracker" && <section>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold">Company-specific resume versions</h2><p className="mt-1 text-sm text-[var(--muted)]">See whether later versions improved against the same supplied role description.</p></div><Badge tone="neutral">Newest first</Badge></div>
      {state.resumeReviews.length === 0 ? <EmptyState icon={<History className="size-6" />} title="No saved resume reviews yet" description="Run a company-specific review, inspect the result, then save it here. Uploading alone never creates a tracker record." action={<Button onClick={() => setTab("polisher")}><Sparkles className="size-4" />Review my first resume</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{state.resumeReviews.map((item, index) => {
        const prior = state.resumeReviews.slice(index + 1).find((older) => older.company.toLowerCase() === item.company.toLowerCase() && older.role.toLowerCase() === item.role.toLowerCase());
        const delta = prior ? item.score - prior.score : null;
        return <article key={item.id} className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">{item.company}</p><h3 className="mt-1 text-lg font-bold">{item.role}</h3><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{new Date(item.createdAt).toLocaleString()}</span>{item.sourceFileName && <span className="inline-flex items-center gap-1"><FileText className="size-3.5" />{item.sourceFileName}</span>}</p></div><div className="text-right"><span className="text-3xl font-bold">{item.score}</span>{delta !== null && <p className={`text-xs font-semibold ${delta > 0 ? "text-emerald-500" : delta < 0 ? "text-rose-500" : "text-[var(--muted)]"}`}>{delta > 0 ? "+" : ""}{delta} vs prior</p>}</div></div><Progress value={item.score} className="mt-5" /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><Badge tone={item.status === "Ready for human review" ? "success" : item.status === "Developing" ? "warning" : "danger"}>{item.status}</Badge><Badge>{item.analysisSource === "ai" ? "AI-assisted" : "Local rubric"}</Badge></div><Button size="sm" variant="secondary" onClick={() => openReview(item)}>Open review</Button></div></article>;
      })}</div>}
    </section>}

    {tab === "portfolio" && <section className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-5"><div className="card p-5 text-center"><div className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white">{state.profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><h2 className="mt-4 text-xl font-bold">{state.profile.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{state.profile.branch}</p><Badge tone="brand" className="mt-4">{state.profile.targetRoles[0] || "Engineering student"}</Badge><Button variant="secondary" className="mt-5 w-full" onClick={() => void copyPortfolio()}><Clipboard className="size-4" />{copied ? "Copied" : "Copy export-ready summary"}</Button></div><div className="card p-5"><h3 className="font-bold">Verified skills</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Verification requires an assessment plus authorized mentor-reviewed evidence for a stated scope.</p><div className="mt-4 space-y-3">{verifiedSkills.map(({ skill, verification }) => <div key={skill.id} className="rounded-xl border border-[var(--line)] p-3"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{skill.name}</span><Badge tone="success"><ShieldCheck className="mr-1 size-3" />Verified</Badge></div><p className="mt-2 text-xs text-[var(--muted)]">{verification.method} · Scope: {verification.scope}</p></div>)}{verifiedSkills.length === 0 && <p className="rounded-xl border border-dashed border-[var(--line)] p-4 text-xs leading-5 text-[var(--muted)]">No skill meets the verification policy yet. Assessed and AI-reviewed work can support readiness, but is not displayed as human-verified.</p>}</div></div></div>
      <div className="card overflow-hidden"><div className="border-b border-[var(--line)] bg-gradient-to-r from-violet-500/12 to-emerald-500/8 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Student engineering portfolio</p><h2 className="mt-3 text-3xl font-bold">I build, test and explain electronic systems.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Focused on RF, radar and signal processing while strengthening embedded foundations.</p><div className="mt-5 flex gap-2"><Button size="sm"><GitBranch className="size-4" />GitHub</Button><Button size="sm" variant="secondary"><Link2 className="size-4" />LinkedIn</Button></div></div><div className="p-6 sm:p-8"><h3 className="font-bold">Selected projects</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{state.projects.map((project) => <article key={project.id} className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center justify-between"><Badge tone={project.status === "Completed" ? "success" : "brand"}>{project.status}</Badge><ExternalLink className="size-4 text-[var(--muted)]" /></div><h4 className="mt-4 font-bold">{project.name}</h4><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{project.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{project.technologies.map((technology) => <Badge key={technology}>{technology}</Badge>)}</div></article>)}</div></div></div>
    </section>}
  </AppShell>;
}

function KeywordCard({ title, values, tone, empty }: { title: string; values: string[]; tone: "success" | "warning"; empty: string }) {
  return <div className="card p-5"><h3 className="font-bold">{title}</h3>{values.length ? <div className="mt-4 flex flex-wrap gap-2">{values.map((value) => <Badge key={value} tone={tone}>{value}</Badge>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">{empty}</p>}</div>;
}

function FormatMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--line)] p-3 text-center"><p className="text-xl font-bold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{label}</p></div>;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
