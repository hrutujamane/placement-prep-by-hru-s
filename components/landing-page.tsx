"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Compass,
  Cpu,
  FolderKanban,
  GraduationCap,
  Menu,
  MessageSquareText,
  Moon,
  Radio,
  Route,
  Sparkles,
  Sun,
  Target,
  TimerReset,
  X,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { Badge, Button, Progress, ScoreRing } from "@/components/ui";
import { brand } from "@/lib/brand";

const journey = ["Discover", "Learn", "Build", "Prove", "Interview", "Get Job Ready"];
const features = [
  { icon: Route, title: "A roadmap that adapts", copy: "Plans respect your available time, prerequisites, pace, deadlines and actual progress." },
  { icon: Compass, title: "Career discovery for ECE", copy: "Explore embedded, RF, radar, VLSI, IoT, automation, software and more—with honest explanations." },
  { icon: FolderKanban, title: "Build work that proves skill", copy: "Turn an idea into milestones, hardware plans, tests, evidence, portfolio content and interview stories." },
  { icon: MessageSquareText, title: "Interview confidence, gradually", copy: "Start with relaxed conversation, then progress toward technical and realistic mock interviews." },
  { icon: ClipboardCheck, title: "Assessment with a purpose", copy: "Every quiz identifies strengths, weak topics and the next revision—not just a score." },
  { icon: BarChart3, title: "Explainable readiness", copy: "See what improves placement and interview readiness without pretending to predict hiring." },
];

export function LandingPage() {
  const { continueDemo, theme, toggleTheme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return <div className="mesh-bg min-h-screen overflow-hidden">
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <a href="#how-it-works" className="text-[var(--muted)] hover:text-[var(--foreground)]">How it works</a>
          <a href="#features" className="text-[var(--muted)] hover:text-[var(--foreground)]">Platform</a>
          <a href="#tracks" className="text-[var(--muted)] hover:text-[var(--foreground)]">Career tracks</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={toggleTheme} className="grid size-10 place-items-center rounded-xl text-[var(--muted)] hover:bg-slate-500/8" aria-label="Toggle theme">{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          <Link href="/login"><Button variant="ghost">Log in</Button></Link>
          <Link href="/signup"><Button>Start my journey <ArrowRight className="size-4" /></Button></Link>
        </div>
        <button className="rounded-xl p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <nav className="border-t border-[var(--line)] bg-[var(--card)] p-4 md:hidden"><div className="grid gap-2"><a href="#how-it-works" className="rounded-xl px-3 py-3 text-sm">How it works</a><a href="#features" className="rounded-xl px-3 py-3 text-sm">Platform</a><a href="#tracks" className="rounded-xl px-3 py-3 text-sm">Career tracks</a><Link href="/login"><Button variant="secondary" className="w-full">Log in</Button></Link><Link href="/signup"><Button className="w-full">Start my journey</Button></Link></div></nav>}
    </header>

    <main>
      <section className="relative px-4 pb-20 pt-34 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="absolute inset-0 -z-10 dot-grid opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
          <div>
            <Badge tone="brand" className="mb-5"><Sparkles className="mr-1.5 size-3.5" />AI Career Operating System for ENTC & ECE</Badge>
            <h1 className="text-balance max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">From Zero to <span className="bg-gradient-to-r from-violet-500 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">Job-Ready.</span></h1>
            <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-[var(--muted)] sm:text-xl">{brand.description} Always know the exact next step—without drowning in disconnected courses.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup"><Button size="lg" className="w-full sm:w-auto">Start My Journey <ArrowRight className="size-4" /></Button></Link>
              <a href="#tracks"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Explore Career Tracks <ChevronRight className="size-4" /></Button></a>
            </div>
            <button onClick={continueDemo} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--brand-strong)]"><CirclePlay className="size-4" />Explore the complete demo workspace</button>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--muted)]"><span className="flex items-center gap-2"><Check className="size-4 text-emerald-500" />No credit card</span><span className="flex items-center gap-2"><Check className="size-4 text-emerald-500" />Built for Indian engineering students</span><span className="flex items-center gap-2"><Check className="size-4 text-emerald-500" />Placement + GATE planning</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-12 top-12 size-40 rounded-full bg-violet-500/20 blur-3xl" /><div className="absolute -right-10 bottom-8 size-40 rounded-full bg-emerald-400/14 blur-3xl" />
            <div className="card relative overflow-hidden p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-strong)]">Today&apos;s mission</p><h2 className="mt-1 text-lg font-bold">RF foundations · 2 hours</h2></div><Badge tone="success">On track</Badge></div>
              <div className="rounded-2xl border border-[var(--line)] bg-slate-500/4 p-4">
                {[{ label: "Signals & Systems bridge", min: 25, done: true }, { label: "Network Theory practice", min: 30, done: true }, { label: "Transmission lines", min: 25, done: false }, { label: "Checkpoint quiz", min: 15, done: false }].map((task, index) => <div key={task.label} className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-0"><div className={`grid size-7 place-items-center rounded-full text-xs font-bold ${task.done ? "bg-emerald-500 text-white" : "border border-[var(--line)] text-[var(--muted)]"}`}>{task.done ? <Check className="size-4" /> : index + 1}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.label}</p><p className="text-xs text-[var(--muted)]">{task.min} minutes</p></div>{!task.done && index === 2 && <Button size="sm"><CirclePlay className="size-3.5" />Start</Button>}</div>)}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--line)] p-4"><ScoreRing value={64} label="Placement readiness" /></div><div className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center justify-between text-sm"><span className="font-semibold">Weekly progress</span><span className="text-[var(--brand-strong)]">6h 50m</span></div><Progress value={71} className="mt-4" /><p className="mt-3 text-xs leading-5 text-[var(--muted)]">Your roadmap adjusted after Tuesday&apos;s progress.</p></div></div>
            </div>
            <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-xl sm:flex sm:items-center sm:gap-3"><div className="grid size-9 place-items-center rounded-xl bg-amber-500/12 text-amber-500"><TimerReset className="size-5" /></div><div><p className="text-xs text-[var(--muted)]">Available today</p><p className="text-sm font-bold">2 focused hours</p></div></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_64%,transparent)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-strong)]">One connected journey</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Every action moves you toward a role.</h2><div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{journey.map((step, index) => <div key={step} className="relative rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-left"><span className="text-xs font-bold text-[var(--brand-strong)]">0{index + 1}</span><p className="mt-6 font-semibold">{step}</p>{index < journey.length - 1 && <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden size-5 rounded-full border border-[var(--line)] bg-[var(--card)] p-1 text-[var(--muted)] lg:block" />}</div>)}</div></div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><Badge tone="brand">Built around “What should I do next?”</Badge><h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">Not another question bank. Your engineering career command center.</h2><p className="mt-4 text-lg leading-8 text-[var(--muted)]">A smaller set of purposeful actions beats a giant library of disconnected content.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, copy }) => <article key={title} className="card group p-6 transition hover:-translate-y-1 hover:border-violet-500/40"><div className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)] transition group-hover:bg-[var(--brand)] group-hover:text-white"><Icon className="size-5" /></div><h3 className="mt-8 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p></article>)}</div></div></section>

      <section id="tracks" className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[#111827] p-6 text-white sm:p-10 lg:p-14"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><Badge className="bg-white/10 text-white">Role-first preparation</Badge><h2 className="mt-4 text-3xl font-bold sm:text-4xl">Explore where electronics can take you.</h2><p className="mt-4 leading-7 text-slate-300">Understand what a role involves, its prerequisites, tools, projects, difficulty and learning path before committing.</p><Link href="/signup"><Button className="mt-7 bg-white text-slate-950 shadow-none hover:bg-slate-100">Find my best-fit track <ArrowRight className="size-4" /></Button></Link></div><div className="grid gap-3 sm:grid-cols-2">{[{ icon: Cpu, name: "Embedded Systems", sub: "C · MCUs · RTOS" }, { icon: Radio, name: "RF & Radar", sub: "EM · Antennas · DSP" }, { icon: BrainCircuit, name: "VLSI", sub: "Digital design · Verification" }, { icon: Bot, name: "AI + Electronics", sub: "Edge AI · Intelligent sensing" }, { icon: Target, name: "Industrial Automation", sub: "PLC · Control · Robotics" }, { icon: BriefcaseBusiness, name: "Software / IT", sub: "DSA · Development · Systems" }].map(({ icon: Icon, name, sub }) => <div key={name} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="grid size-10 place-items-center rounded-xl bg-white/10"><Icon className="size-5" /></div><div><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div></div>)}</div></div></div></section>

      <section className="border-y border-[var(--line)] px-4 py-20 text-center sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><GraduationCap className="mx-auto size-10 text-[var(--brand)]" /><h2 className="mt-5 text-balance text-3xl font-bold sm:text-5xl">From confused student to industry-ready engineer.</h2><p className="mt-5 text-lg text-[var(--muted)]">Tell us your goal, available time and current level. We&apos;ll turn that into the next achievable mission.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup"><Button size="lg">Start My Journey <ArrowRight className="size-4" /></Button></Link><Button size="lg" variant="secondary" onClick={continueDemo}><BookOpenCheck className="size-4" />Open Demo</Button></div></div></section>
    </main>

    <footer className="px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-[var(--line)] pt-8 sm:flex-row sm:items-center sm:justify-between"><div><BrandMark /><p className="mt-3 text-xs text-[var(--muted)]">{brand.tagline}</p></div><p className="text-xs text-[var(--muted)]">AI-generated recommendations are guidance. Verify current jobs, courses and hiring details from official sources.</p></div></footer>
  </div>;
}
