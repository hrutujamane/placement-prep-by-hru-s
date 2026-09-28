"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, Check, CircleDot, ClipboardCheck, Code2, Cpu, FolderKanban, GitBranch, Lightbulb, Plus, ShieldCheck, Sparkles, Wrench, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { EquipmentInventory } from "@/components/equipment-inventory";
import { Badge, Button, Input, Label, PageHeader, Progress } from "@/components/ui";
import type { ProjectTemplate } from "@/lib/types";

const generatedPlan = {
  title: "ESP32 Smart Irrigation & Telemetry System",
  problem: "Reduce unnecessary watering by measuring soil moisture and controlling a low-voltage pump while publishing safe telemetry.",
  outcomes: ["Read analog sensors reliably", "Control loads with isolation", "Use MQTT telemetry", "Design fail-safe behavior", "Document and test an embedded system"],
  prerequisites: ["C/C++ basics", "Voltage and current basics", "GPIO and ADC overview"],
  hardware: ["ESP32 development board", "Capacitive soil moisture sensor", "5V relay module or MOSFET driver", "Low-voltage DC pump", "Separate pump supply", "Flyback protection", "Tubing and reservoir"],
  software: ["PlatformIO or Arduino IDE", "MQTT broker", "Serial monitor", "Git and GitHub"],
  protocols: ["Wi-Fi", "MQTT", "ADC", "GPIO"],
  cost: "₹1,200–₹2,000 depending on pump and enclosure; verify live local prices before purchase.",
  milestones: ["Define requirements and safety limits", "Calibrate moisture readings", "Validate isolated pump control", "Publish MQTT telemetry", "Implement dry-run and sensor-failure handling", "Run repeatable tests", "Record demo and publish evidence"],
};

export function ProjectsPage() {
  const { state, addProject } = useApp();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [idea, setIdea] = useState("I want to build a smart irrigation system");
  const [generated, setGenerated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateNotice, setTemplateNotice] = useState("");

  function generate(event: FormEvent) { event.preventDefault(); setCreating(true); window.setTimeout(() => { setGenerated(true); setCreating(false); }, 650); }
  function saveProject() {
    addProject({ name: generatedPlan.title, status: "Planning", description: generatedPlan.problem, technologies: ["ESP32", "C++", "MQTT"], components: generatedPlan.hardware.slice(0, 4), nextMilestone: generatedPlan.milestones[0] });
    setBuilderOpen(false); setGenerated(false);
  }
  function useReviewedTemplate(template: ProjectTemplate) {
    const existing = state.projects.find((project) => project.templateId === template.id);
    if (existing) {
      setTemplateNotice(`${template.title} is already in your project workspace.`);
      return;
    }
    addProject({
      name: template.title,
      status: "Planning",
      description: template.problemStatement,
      technologies: template.softwareSetup.slice(0, 3),
      components: template.components.filter((item) => item.requirement === "required").map((item) => item.name),
      nextMilestone: template.implementationStages[0],
      templateId: template.id,
      templateRevision: template.revision,
      mode: template.mode,
    });
    setTemplateNotice(`${template.title} was added from reviewed template revision ${template.revision}. Open its workspace to start.`);
  }

  return <AppShell>
    <PageHeader eyebrow="Learn → Build → Prove" title="Project Builder" description="Turn an engineering idea into a safe, testable project plan and the evidence needed for your portfolio." action={<Button onClick={() => setBuilderOpen(true)}><Plus className="size-4" />Build a project</Button>} />
    <EquipmentInventory onUseTemplate={useReviewedTemplate} />
    {templateNotice && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><span>{templateNotice}</span><button className="font-semibold text-[var(--brand-strong)]" onClick={() => setTemplateNotice("")}>Dismiss</button></div>}
    <section className="mb-6 grid gap-4 sm:grid-cols-3"><Summary icon={<FolderKanban />} label="Active projects" value={String(state.projects.filter((project) => project.status !== "Completed").length)} /><Summary icon={<ClipboardCheck />} label="Milestones complete" value="7 / 18" /><Summary icon={<GitBranch />} label="Proof published" value={`${state.projects.filter((project) => project.githubUrl).length} projects`} /></section>
    <section className="grid gap-5 lg:grid-cols-2">{state.projects.map((project) => <article key={project.id} className="card overflow-hidden"><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)]"><Cpu className="size-5" /></div><div className="flex flex-wrap justify-end gap-2"><Badge tone={project.status === "Completed" ? "success" : project.status === "Testing" ? "warning" : "brand"}>{project.status}</Badge>{project.templateRevision && <Badge>Reviewed template · rev {project.templateRevision}</Badge>}</div></div><h2 className="mt-5 text-xl font-bold">{project.name}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{project.description}</p><div className="mt-5 flex flex-wrap gap-2">{project.technologies.map((technology) => <Badge key={technology}>{technology}</Badge>)}</div><div className="mt-6"><div className="mb-2 flex items-center justify-between text-xs"><span>Project progress</span><strong>{project.progress}%</strong></div><Progress value={project.progress} /></div><div className="mt-5 rounded-2xl border border-[var(--line)] bg-slate-500/4 p-4"><p className="text-xs text-[var(--muted)]">Next milestone</p><p className="mt-1 text-sm font-semibold">{project.nextMilestone}</p></div></div><div className="flex items-center justify-between border-t border-[var(--line)] px-5 py-4 sm:px-6"><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="size-4 text-emerald-500" />Evidence-gated verification</div><Link href={`/projects/${project.id}`}><Button variant="ghost" size="sm">Open workspace <ArrowRight className="size-4" /></Button></Link></div></article>)}</section>

    {builderOpen && <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto my-3 max-w-5xl rounded-[1.6rem] border border-[var(--line)] bg-[var(--background)] shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] p-5 backdrop-blur-xl"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">AI Project Architect</p><h2 className="mt-1 text-xl font-bold">Plan a credible engineering project</h2></div><button onClick={() => setBuilderOpen(false)} className="rounded-xl border border-[var(--line)] p-2"><X className="size-5" /></button></header><div className="p-5 sm:p-7"><form onSubmit={generate}><Label>What do you want to build?</Label><div className="flex flex-col gap-3 sm:flex-row"><Input value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Describe your project idea" /><Button loading={creating} className="shrink-0">Generate project plan <Sparkles className="size-4" /></Button></div><p className="mt-2 text-xs text-[var(--muted)]">The plan uses your current skill level and never invents completed results.</p></form>{generated && <div className="mt-8 space-y-6"><div className="rounded-2xl border border-violet-500/25 bg-violet-500/7 p-5"><div className="flex flex-wrap items-center gap-2"><Badge tone="brand">AI-generated recommendation</Badge><Badge tone="warning">Verify component prices</Badge></div><h3 className="mt-4 text-2xl font-bold">{generatedPlan.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{generatedPlan.problem}</p></div><div className="grid gap-5 lg:grid-cols-2"><PlanCard icon={<Lightbulb />} title="Learning outcomes" items={generatedPlan.outcomes} /><PlanCard icon={<Code2 />} title="Prerequisites & software" items={[...generatedPlan.prerequisites, ...generatedPlan.software]} /><PlanCard icon={<Wrench />} title="Hardware & components" items={generatedPlan.hardware} /><PlanCard icon={<CircleDot />} title="Protocols & power" items={[...generatedPlan.protocols, "Keep pump power separate from ESP32 logic power", "Use common ground only where the driver design requires it"]} /></div><div className="card p-5"><h3 className="font-bold">Implementation milestones</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{generatedPlan.milestones.map((milestone, index) => <div key={milestone} className="flex gap-3 rounded-xl border border-[var(--line)] p-3"><div className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-500/10 text-xs font-bold text-[var(--brand)]">{index + 1}</div><p className="text-sm font-medium">{milestone}</p></div>)}</div></div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-5"><div className="flex items-center gap-2 font-bold"><AlertCircle className="size-5 text-amber-500" />Testing and failure plan</div><ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]"><li>• Test ADC stability with dry, moist and saturated soil samples.</li><li>• Confirm pump defaults OFF after reset, Wi-Fi loss or sensor failure.</li><li>• Measure supply voltage during pump startup and inspect brownouts.</li><li>• Log every threshold decision for repeatable debugging.</li></ul></div><div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5"><h3 className="font-bold">Cost, resume and interview value</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{generatedPlan.cost}</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Demonstrates sensor calibration, embedded safety, communication protocols, testing and system-level tradeoffs.</p></div></div><div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setGenerated(false)}>Revise idea</Button><Button onClick={saveProject}>Save project workspace <Check className="size-4" /></Button></div></div>}</div></div></div>}
  </AppShell>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="card flex items-center gap-4 p-4"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)] [&_svg]:size-5">{icon}</div><div><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div></div>; }
function PlanCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) { return <div className="card p-5"><div className="flex items-center gap-2 font-bold"><span className="text-[var(--brand)] [&_svg]:size-5">{icon}</span>{title}</div><ul className="mt-4 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-5 text-[var(--muted)]"><Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />{item}</li>)}</ul></div>; }
