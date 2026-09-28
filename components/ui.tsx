"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", size = "md", loading, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
        variant === "primary" && "bg-[var(--brand)] text-white shadow-lg shadow-violet-500/20 hover:bg-[var(--brand-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--brand)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--card)_72%,transparent)] hover:text-[var(--foreground)]",
        variant === "danger" && "bg-rose-500/12 text-rose-500 hover:bg-rose-500/18",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--brand)]", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)]", className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...props} />;
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "danger"; className?: string }) {
  return <span className={cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
    tone === "neutral" && "bg-slate-500/10 text-[var(--muted)]",
    tone === "brand" && "bg-violet-500/12 text-[var(--brand-strong)]",
    tone === "success" && "bg-emerald-500/12 text-emerald-500",
    tone === "warning" && "bg-amber-500/14 text-amber-600 dark:text-amber-400",
    tone === "danger" && "bg-rose-500/12 text-rose-500",
    className,
  )}>{children}</span>;
}

export function Progress({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  return <div className={cn("h-2 overflow-hidden rounded-full bg-slate-500/12", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
    <div className={cn("progress-indicator h-full rounded-full bg-[var(--brand)] transition-all duration-500", indicatorClassName)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-strong)]">{eyebrow}</p>}
      <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p>
    </div>
    {action}
  </div>;
}

export function ScoreRing({ value, label, tone = "brand" }: { value: number; label: string; tone?: "brand" | "mint" }) {
  const color = tone === "mint" ? "var(--mint)" : "var(--brand)";
  return <div className="flex items-center gap-4">
    <div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, color-mix(in srgb, var(--line) 72%, transparent) 0)` }}>
      <div className="grid size-16 place-items-center rounded-full bg-[var(--card)]">
        <span className="text-xl font-bold">{value}</span>
      </div>
    </div>
    <div><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-[var(--muted)]">Readiness, not hiring probability</p></div>
  </div>;
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="card flex min-h-56 flex-col items-center justify-center p-8 text-center">
    <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)]">{icon}</div>
    <h3 className="font-semibold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
