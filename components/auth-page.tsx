"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { Badge, Button, Input, Label } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const { login, signup, continueDemo, mockMode } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      if (mode === "login") await login(email, password);
      if (mode === "signup") await signup(name, email, password);
      if (mode === "forgot") {
        if (!email.includes("@")) throw new Error("Enter the email address linked to your account.");
        if (!mockMode) {
          const { error: resetError } = await createSupabaseBrowserClient()!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
          if (resetError) throw resetError;
        }
        setSent(true);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Build your career operating system" : "Reset your password";
  const copy = mode === "login" ? "Sign in first, then describe your goal to receive a realistic roadmap built around your level, deadline and available time." : mode === "signup" ? "Create a plan around your role, time and current skills." : "We’ll send a secure reset link to your email.";

  return <main className="mesh-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--card)] shadow-2xl shadow-slate-950/10 lg:grid-cols-[.92fr_1.08fr]">
      <section className="relative hidden overflow-hidden bg-[#10161c] p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -left-20 top-20 size-72 rounded-full bg-violet-500/20 blur-3xl" /><div className="absolute -right-24 bottom-12 size-64 rounded-full bg-amber-400/12 blur-3xl" />
        <BrandMark className="relative [&_span]:text-white" />
        <div className="relative my-auto"><Badge className="bg-white/10 text-white"><Sparkles className="mr-1.5 size-3.5" />Your next step, made clear</Badge><h2 className="mt-5 max-w-lg text-4xl font-bold leading-tight">Your ambition is the goal. We&apos;ll build the system around it.</h2><div className="mt-8 space-y-4">{["Personalized daily, weekly and long-term roadmaps", "Projects that turn learning into visible evidence", "Interview practice that builds confidence gradually", "Placement + GATE planning without overload"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 className="size-5 text-emerald-400" />{item}</div>)}</div></div>
        <p className="relative text-xs text-slate-400">Built for ENTC, ECE and Electronics students in India.</p>
      </section>
      <section className="flex flex-col p-6 sm:p-10 lg:p-14">
        <div className="mb-10 flex items-center justify-between lg:justify-end"><BrandMark className="lg:hidden" />{mode !== "login" && <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft className="size-4" />Back to login</Link>}</div>
        <div className="mx-auto my-auto w-full max-w-md">
          <div className="flex flex-wrap items-center justify-between gap-3"><Badge tone={mockMode ? "warning" : "success"}>{mockMode ? "Demo services active" : "Secure services connected"}</Badge>{mode === "login" && <button type="button" onClick={() => setEmail("hrutujamane492@gmail.com")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]" aria-label="Use admin email to sign in" title="Admin sign in"><ShieldCheck className="size-4" />Admin sign in</button>}</div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p>
          {sent ? <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-6 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><h3 className="mt-4 font-semibold">Check your inbox</h3><p className="mt-2 text-sm text-[var(--muted)]">{mockMode ? "Demo mode simulated the email successfully." : `A reset link was sent to ${email}.`}</p><Link href="/login"><Button className="mt-5">Return to login</Button></Link></div> : <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === "signup" && <div><Label htmlFor="auth-name">Name</Label><Input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required /></div>}
            <div><Label htmlFor="auth-email">Email</Label><Input id="auth-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@college.edu" autoComplete="email" required /></div>
            {mode !== "forgot" && <div><div className="flex items-center justify-between"><Label htmlFor="auth-password">Password</Label>{mode === "login" && <Link href="/forgot-password" className="mb-1.5 text-xs font-semibold text-[var(--brand-strong)]">Forgot password?</Link>}</div><div className="relative"><Input id="auth-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>}
            {error && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-500">{error}</div>}
            <Button size="lg" className="w-full" loading={loading}>{mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Send reset link"}<ArrowRight className="size-4" /></Button>
          </form>}
          {mode !== "forgot" && <><div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-[var(--line)]" /><span className="text-xs text-[var(--muted)]">or</span><div className="h-px flex-1 bg-[var(--line)]" /></div><Button type="button" variant="secondary" size="lg" className="w-full" onClick={continueDemo}><Sparkles className="size-4 text-[var(--brand)]" />Continue as demo student</Button></>}
          <p className="mt-7 text-center text-sm text-[var(--muted)]">{mode === "login" ? <>New here? <Link href="/signup" className="font-semibold text-[var(--brand-strong)]">Create an account</Link></> : mode === "signup" ? <>Already have an account? <Link href="/login" className="font-semibold text-[var(--brand-strong)]">Log in</Link></> : <Link href="/login" className="font-semibold text-[var(--brand-strong)]">Back to login</Link>}</p>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="size-4" />Your data is private and protected by row-level security.</div>
        </div>
      </section>
    </div>
  </main>;
}
