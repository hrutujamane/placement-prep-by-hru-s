"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Code2, FileText, FlaskConical, GitBranch, MessageSquareText, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { buildEvidenceFingerprint, evidenceStatusPolicy, generateProjectOutputs, getEvidenceQuestions } from "@/lib/evidence";
import { findProjectTemplate, matchProjectsToInventory } from "@/lib/project-guidance";
import type { EvidenceType } from "@/lib/types";

const evidenceTypes: Array<{ value: EvidenceType; label: string }> = [
  { value: "source_code", label: "Source code" },
  { value: "github", label: "Selected GitHub link" },
  { value: "circuit_diagram", label: "Circuit diagram" },
  { value: "test_observation", label: "Test observation" },
  { value: "image", label: "Image reference" },
  { value: "demo_video", label: "Demo video link" },
  { value: "debugging_note", label: "Debugging note" },
  { value: "limitations", label: "Limitations" },
  { value: "contribution", label: "Personal contribution" },
];

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { state, submitEvidence } = useApp();
  const project = state.projects.find((item) => item.id === projectId);
  const [type, setType] = useState<EvidenceType>("test_observation");
  const [skillId, setSkillId] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [contribution, setContribution] = useState("");
  const [debugging, setDebugging] = useState("");
  const [limitations, setLimitations] = useState("");
  const [notice, setNotice] = useState("");
  const [showOutputs, setShowOutputs] = useState(false);
  const template = findProjectTemplate(project?.templateId);
  const match = template ? matchProjectsToInventory(state.equipment, state.buildPreferences).find((item) => item.template.id === template.id) : undefined;
  const submissions = state.evidenceSubmissions.filter((item) => item.projectId === projectId);
  const questions = project ? getEvidenceQuestions(project, { type }) : [];
  const outputs = project ? generateProjectOutputs(project, submissions) : null;

  if (!project) return <AppShell><div className="card p-8 text-center"><h1 className="text-2xl font-bold">Project not found</h1><p className="mt-2 text-sm text-[var(--muted)]">This workspace is not available in the current student record.</p><Link href="/projects"><Button className="mt-5">Back to projects</Button></Link></div></AppShell>;

  function submit(event: FormEvent) {
    event.preventDefault();
    const fingerprint = buildEvidenceFingerprint(project!.id, type, summary, url);
    const saved = submitEvidence({
      projectId: project!.id,
      milestoneId: project!.nextMilestone,
      skillIds: skillId ? [skillId] : [],
      type,
      title: `${evidenceTypes.find((item) => item.value === type)?.label}: ${project!.nextMilestone}`,
      content: summary.trim(),
      url: url.trim() || undefined,
      expectedResult: expected.trim() || undefined,
      actualResult: actual.trim() || undefined,
      personalContribution: contribution.trim() || undefined,
      debuggingNotes: debugging.trim() || undefined,
      limitations: limitations.trim() || undefined,
      rubricVersion: undefined,
      feedback: undefined,
      reviewLimitations: undefined,
      fingerprint,
    });
    if (!saved) {
      setNotice("This evidence is already saved. Duplicate submissions do not increase readiness.");
      return;
    }
    setNotice("Evidence submitted. Submission alone does not verify mastery; review status remains Submitted.");
    setSummary(""); setUrl(""); setExpected(""); setActual(""); setContribution(""); setDebugging(""); setLimitations("");
  }

  return <AppShell>
    <div className="mb-5"><Link href="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft className="size-4" />All projects</Link></div>
    <PageHeader eyebrow="Project workspace" title={project.name} description="Build from reviewed guidance, test honestly, submit evidence and practise explaining only what is documented." action={<Link href="/interview"><Button variant="secondary"><MessageSquareText className="size-4" />Practise explanation</Button></Link>} />

    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Status" value={project.status} /><Summary label="Mode" value={project.mode ?? "Not recorded"} /><Summary label="Next milestone" value={project.nextMilestone} /><Summary label="Evidence" value={`${submissions.length} submission${submissions.length === 1 ? "" : "s"}`} /></section>

    {template ? <section className="mb-6 card p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><Badge tone="success">Reviewed guidance</Badge><Badge>Revision {template.revision}</Badge><Badge>{template.source}</Badge></div><h2 className="mt-4 text-xl font-bold">Implementation guide</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted)]">{template.compatibilityNotes}</p></div><ShieldCheck className="size-7 shrink-0 text-emerald-500" /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><Guide title="Problem and career relevance" icon={<Sparkles />} items={[template.problemStatement, template.careerRelevance]} /><Guide title="Learning outcomes and prerequisites" icon={<ClipboardCheck />} items={[...template.learningOutcomes, ...template.prerequisites.map((item) => `Prerequisite: ${item}`)]} /><Guide title="Architecture" icon={<Code2 />} items={template.architecture} /><Guide title="Components and tools" icon={<Wrench />} items={template.components.map((item) => `${item.requirement === "required" ? "Required" : "Optional"}: ${item.name} × ${item.quantity}`)} /><Guide title="Voltage and power" icon={<AlertTriangle />} items={template.voltageAndPower} warning /><Guide title="Software setup" icon={<Code2 />} items={template.softwareSetup} /></div>{match?.safetyQuestions.length ? <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-5"><h3 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-5 text-amber-500" />Exact connections are paused</h3><p className="mt-2 text-sm text-[var(--muted)]">A model or power detail affects safe guidance. Confirm these before using exact connection instructions:</p>{match.safetyQuestions.map((question) => <p key={question} className="mt-2 text-sm font-medium">• {question}</p>)}</div> : <Guide title="Reviewed connection boundaries" icon={<CheckCircle2 />} items={template.connections} className="mt-5" />}<div className="mt-5 grid gap-5 lg:grid-cols-2"><Guide title="Implementation stages" icon={<Sparkles />} items={template.implementationStages} /><Guide title="Expected results" icon={<CheckCircle2 />} items={template.expectedResults} /><Guide title="Testing checklist" icon={<FlaskConical />} items={template.testingChecklist} /><Guide title="Debugging decision tree" icon={<GitBranch />} items={template.debuggingDecisionTree} /><Guide title="Known limitations" icon={<AlertTriangle />} items={template.limitations} warning /><Guide title="Possible upgrades" icon={<Sparkles />} items={template.upgrades} /></div></section> : <section className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-5"><h2 className="font-bold">Custom project guidance</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">This project is not linked to a reviewed template. Treat its wiring and power notes as unreviewed until a compatible template or mentor review is attached.</p></section>}

    <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <form onSubmit={submit} className="card p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[var(--brand-strong)]">Prove it</p><h2 className="mt-1 text-xl font-bold">Submit evidence and understanding</h2></div><ShieldCheck className="size-6 text-[var(--brand)]" /></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Files and links are records for review, not automatic proof. The application never claims code ran unless an execution result is explicitly documented.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Evidence type"><Select value={type} onChange={(event) => setType(event.target.value as EvidenceType)}>{evidenceTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field><Field label="Associated skill"><Select value={skillId} onChange={(event) => setSkillId(event.target.value)}><option value="">Project-level evidence</option>{state.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</Select></Field></div><Field label="Selected link, if applicable" className="mt-4"><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/... (only the selected link is stored)" className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 text-sm" /></Field><Field label="Why these choices? What should a reviewer inspect?" className="mt-4"><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={20} /></Field><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Expected result"><Textarea value={expected} onChange={(event) => setExpected(event.target.value)} /></Field><Field label="Actual result"><Textarea value={actual} onChange={(event) => setActual(event.target.value)} /></Field><Field label="What failed and how did you debug it?"><Textarea value={debugging} onChange={(event) => setDebugging(event.target.value)} /></Field><Field label="What was your personal contribution?"><Textarea value={contribution} onChange={(event) => setContribution(event.target.value)} /></Field></div><Field label="Known limitations" className="mt-4"><Textarea value={limitations} onChange={(event) => setLimitations(event.target.value)} /></Field><div className="mt-5 rounded-2xl bg-slate-500/6 p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)]">Explanation prompts grounded in this project</p>{questions.map((question) => <p key={question} className="mt-2 text-xs leading-5">• {question}</p>)}</div>{notice && <p className="mt-4 rounded-xl bg-violet-500/8 px-4 py-3 text-sm">{notice}</p>}<Button className="mt-5 w-full" type="submit">Submit evidence for review</Button></form>

      <div className="space-y-6"><div className="card p-5 sm:p-6"><h2 className="font-bold">Evidence history</h2><div className="mt-4 space-y-3">{submissions.map((submission) => <article key={submission.id} className="rounded-2xl border border-[var(--line)] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{submission.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(submission.submittedAt).toLocaleDateString()} · {submission.reviewMethod}</p></div><Badge tone={submission.status === "Mentor-reviewed" ? "success" : submission.status === "Revision requested" ? "danger" : submission.status === "AI-reviewed" ? "brand" : "warning"}>{submission.status}</Badge></div><p className="mt-3 text-xs leading-5 text-[var(--muted)]">{evidenceStatusPolicy[submission.status]}</p>{submission.feedback && <p className="mt-3 rounded-xl bg-slate-500/6 px-3 py-2 text-xs">{submission.feedback}</p>}{submission.reviewLimitations && <p className="mt-2 text-xs text-[var(--muted)]">Review limitation: {submission.reviewLimitations}</p>}{submission.simulated && <Badge tone="warning" className="mt-3">Seeded demo evidence</Badge>}</article>)}{submissions.length === 0 && <p className="rounded-xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">No evidence submitted yet.</p>}</div></div><div className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Career outputs from evidence</h2><p className="mt-1 text-xs text-[var(--muted)]">Generated locally from documented facts for your review. Nothing is published automatically.</p></div><FileText className="size-5 text-[var(--brand)]" /></div><Button className="mt-4 w-full" variant="secondary" onClick={() => setShowOutputs((current) => !current)}>{showOutputs ? "Hide drafts" : "Generate review drafts"}</Button>{showOutputs && outputs && <div className="mt-4 space-y-4"><Output title="Resume bullet" text={outputs.resumeBullet} /><Output title="Portfolio description" text={outputs.portfolioDescription} /><Output title="LinkedIn description" text={outputs.linkedInDescription} /><Output title="Short interview explanation" text={outputs.shortInterviewExplanation} /><Output title="GitHub README draft" text={outputs.readme} preserve /></div>}</div></div>
    </section>
  </AppShell>;
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div className={className}><Label>{label}</Label>{children}</div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="card p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 line-clamp-2 font-bold">{value}</p></div>; }
function Guide({ title, icon, items, warning, className }: { title: string; icon: React.ReactNode; items: string[]; warning?: boolean; className?: string }) { return <div className={`${className ?? ""} rounded-2xl border p-5 ${warning ? "border-amber-500/25 bg-amber-500/6" : "border-[var(--line)]"}`}><h3 className="flex items-center gap-2 font-bold"><span className={warning ? "text-amber-500" : "text-[var(--brand)]"}>{icon}</span>{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="text-sm leading-6 text-[var(--muted)]">• {item}</li>)}</ul></div>; }
function Output({ title, text, preserve }: { title: string; text: string; preserve?: boolean }) { return <div className="rounded-xl border border-[var(--line)] p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)]">{title}</p><p className={`mt-2 text-sm leading-6 ${preserve ? "whitespace-pre-wrap" : ""}`}>{text}</p></div>; }
