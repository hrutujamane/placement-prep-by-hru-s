"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Boxes, ClipboardCheck, Compass, FolderKanban, MessageSquareText, Route, ShieldCheck, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, PageHeader, Progress } from "@/components/ui";
import { evidenceReadinessScore, getSkillVerification } from "@/lib/evidence";
import { findProjectTemplate } from "@/lib/project-guidance";
import { calculatePlacementReadiness } from "@/lib/readiness";

export function EngineeringJourneyPage() {
  const { state } = useApp();
  const activeMilestone = state.roadmap?.milestones.find((item) => item.status === "active") ?? state.roadmap?.milestones.find((item) => item.status !== "completed");
  const learningTask = state.tasks.find((item) => item.status !== "completed" && item.type === "learn");
  const targetTrack = state.roadmap?.track ?? state.profile.targetRoles[0];
  const activeProject = state.projects.find((item) => item.status !== "Completed" && projectMatchesTrack(item, targetTrack));
  const evidence = evidenceReadinessScore(state.evidenceSubmissions);
  const readiness = calculatePlacementReadiness(state);
  const needsPractice = state.skills
    .filter((skill) => !getSkillVerification(skill, state.evidenceSubmissions).verified)
    .sort((first, second) => first.progress - second.progress)
    .slice(0, 3);
  const latestEvidence = activeProject ? state.evidenceSubmissions.find((item) => item.projectId === activeProject.id) : undefined;

  return <AppShell>
    <PageHeader eyebrow="My Engineering Journey" title="One connected path from goal to proof." description="See where you are, why the current work matters, what counts as completion and the next action across every module." action={<Link href="/dashboard"><Button>Open today&apos;s mission <ArrowRight className="size-4" /></Button></Link>} />

    <section className="mb-6 overflow-hidden rounded-[1.6rem] border border-violet-500/20 bg-gradient-to-br from-violet-500/12 via-[var(--card)] to-orange-400/10 p-5 sm:p-7"><div className="grid gap-6 lg:grid-cols-[1fr_.42fr]"><div><Badge tone="brand"><Target className="mr-1.5 size-3.5" />Target role</Badge><h2 className="mt-4 text-2xl font-bold">{state.roadmap?.track ?? state.profile.targetRoles[0] ?? "Choose a target role"}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{state.roadmap?.goal ?? "Use Career Discovery, try multiple role activities and choose a goal when ready."}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><JourneyFact label="Current milestone" value={activeMilestone?.title ?? "Create a roadmap"} /><JourneyFact label="Learning now" value={learningTask?.skill ?? activeMilestone?.skills[0] ?? "Baseline assessment"} /><JourneyFact label="Building now" value={activeProject?.name ?? "Choose a relevant project"} /></div></div><div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Placement readiness</span><strong className="text-3xl">{readiness.score}</strong></div><Progress value={readiness.score} className="mt-4" /><p className="mt-3 text-xs leading-5 text-[var(--muted)]">A transparent preparation score, not hiring probability. Reviewed evidence contributes through de-duplicated rules.</p></div></div></section>

    <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><JourneyLink href="/career-discovery" icon={<Compass />} title="Explore the role" detail={`${state.roleExplorationAttempts.length} activity attempt(s) saved`} /><JourneyLink href="/roadmap" icon={<Route />} title="Follow the roadmap" detail={activeMilestone?.completionCriteria[0] ?? "Generate milestone completion criteria"} /><JourneyLink href="/projects" icon={<Boxes />} title="Build with what I have" detail={`${state.equipment.filter((item) => item.status === "working").length} working inventory records`} /><JourneyLink href={activeProject ? `/projects/${activeProject.id}` : "/projects"} icon={<FolderKanban />} title="Prove the project" detail={`${state.evidenceSubmissions.length} evidence record(s) across projects`} /></section>

    <section className="grid gap-6 xl:grid-cols-[1.08fr_.92fr]">
      <div className="card p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">Connected progress</p><h2 className="mt-1 text-xl font-bold">From learning to evidence</h2></div><ShieldCheck className="size-6 text-emerald-500" /></div><div className="mt-6 space-y-3"><ConnectedRow icon={<BookOpenCheck />} label="Learning" value={learningTask?.title ?? "No learning task scheduled"} completion={learningTask?.completionCriteria ?? "Create a roadmap task with a visible completion criterion."} /><ConnectedRow icon={<FolderKanban />} label="Practical implementation" value={activeProject?.nextMilestone ?? "Select a reviewed project template"} completion={activeProject ? "Complete the milestone and record expected versus actual results." : "Save a feasible project based on real equipment or simulation tools."} /><ConnectedRow icon={<ClipboardCheck />} label="Evidence submitted" value={latestEvidence?.title ?? "No evidence submitted"} completion={latestEvidence ? `${latestEvidence.status}: ${latestEvidence.reviewLimitations ?? "review scope is recorded with the submission"}` : "Submit source, diagram, observations, contribution and limitations."} /><ConnectedRow icon={<MessageSquareText />} label="Interview explanation" value={`Day ${state.interviewProgram.currentDay} of ${state.interviewProgram.totalDays}`} completion="Answer, receive specific feedback, retry and save self-reported confidence." /></div></div>

      <div className="space-y-6"><div className="card p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">Recommended next action</p><h2 className="mt-2 text-xl font-bold">{state.roadmap?.nextStep ?? learningTask?.title ?? "Try a career activity"}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{activeMilestone ? `This supports the active milestone: ${activeMilestone.title}.` : "Create a time-bound roadmap after exploring the role."}</p><Link href={state.roadmap ? "/dashboard" : "/career-discovery"}><Button className="mt-5 w-full">Do the next action <ArrowRight className="size-4" /></Button></Link></div><div className="card p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-bold">What still needs practice</h2><Badge tone="warning">Not verified</Badge></div><div className="mt-4 space-y-3">{needsPractice.map((skill) => { const policy = getSkillVerification(skill, state.evidenceSubmissions); return <div key={skill.id} className="rounded-xl border border-[var(--line)] p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{skill.name}</p><span className="text-xs text-[var(--muted)]">{skill.state}</span></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{policy.method}</p></div>; })}</div><div className="mt-4 rounded-xl bg-slate-500/6 p-3 text-xs leading-5 text-[var(--muted)]">Evidence score: {evidence.score}. {evidence.explanation}</div></div></div>
    </section>
  </AppShell>;
}

function JourneyFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
function JourneyLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) { return <Link href={href} className="card group p-4"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]">{icon}</div><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{detail}</p></div></div><div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand-strong)]">Open module <ArrowRight className="size-3.5 transition group-hover:translate-x-1" /></div></Link>; }
function ConnectedRow({ icon, label, value, completion }: { icon: React.ReactNode; label: string; value: string; completion: string }) { return <div className="flex gap-3 rounded-2xl border border-[var(--line)] p-4"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">{icon}</div><div><p className="text-xs font-bold uppercase tracking-[.1em] text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold">{value}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Completion: {completion}</p></div></div>; }

function projectMatchesTrack(project: import("@/lib/types").Project, track: string | undefined) {
  if (!track) return true;
  const template = findProjectTemplate(project.templateId);
  if (template?.track.toLowerCase() === track.toLowerCase()) return true;
  const keywords = track.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  const projectText = [project.name, project.description, ...project.technologies].join(" ").toLowerCase();
  return keywords.some((keyword) => projectText.includes(keyword));
}
