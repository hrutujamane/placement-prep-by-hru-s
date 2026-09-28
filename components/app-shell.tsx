"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  FolderKanban,
  History,
  Milestone,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Route,
  Sparkles,
  Sun,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-provider";
import { BrandMark } from "@/components/brand-mark";
import { OpportunityAlert } from "@/components/opportunity-alert";
import { ReportIssueButton } from "@/components/report-issue-button";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journey", label: "My Engineering Journey", icon: Milestone },
  { href: "/career-discovery", label: "Career Discovery", icon: Compass },
  { href: "/roadmap", label: "Roadmap & Skills", icon: Route },
  { href: "/prep-history", label: "Prep History", icon: History },
  { href: "/projects", label: "Project Builder", icon: FolderKanban },
  { href: "/resources", label: "Learning Resources", icon: LibraryBig },
  { href: "/quiz", label: "Assessments", icon: ClipboardCheck },
  { href: "/interview", label: "Interview Prep", icon: MessageSquareText },
  { href: "/resume", label: "Resume & Portfolio", icon: FileText },
  { href: "/jobs", label: "Applications", icon: BriefcaseBusiness },
];

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) router.replace("/login");
  }, [authenticated, loading, router]);

  if (loading || !authenticated) {
    return <main className="mesh-bg grid min-h-screen place-items-center"><div className="text-center"><div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-violet-500/20 border-t-[var(--brand)]" /><p className="text-sm text-[var(--muted)]">Preparing your career workspace…</p></div></main>;
  }
  return children;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, logout, mockMode, theme, toggleTheme, isAdmin } = useApp();
  const visibleNavItems = isAdmin ? [...navItems, { href: "/admin", label: "Admin", icon: ShieldCheck }] : navItems;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return <RequireAuth>
    <div className="min-h-screen bg-[var(--background)]">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_95%,transparent)] px-3 py-4 backdrop-blur-xl transition-all lg:flex lg:flex-col", collapsed ? "w-20" : "w-64")}>
        <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          <BrandMark compact={collapsed} />
          {!collapsed && <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-500/10" aria-label="Collapse navigation"><ChevronLeft className="size-4" /></button>}
        </div>
        {collapsed && <button onClick={() => setCollapsed(false)} className="mx-auto mb-4 rounded-lg p-2 text-[var(--muted)] hover:bg-slate-500/10" aria-label="Expand navigation"><ChevronRight className="size-4" /></button>}
        <nav className="space-y-1" aria-label="Primary navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition", active ? "nav-active bg-[var(--brand)] text-white shadow-md shadow-violet-500/15" : "text-[var(--muted)] hover:bg-slate-500/8 hover:text-[var(--foreground)]", collapsed && "justify-center px-0")}>
              <Icon className="size-[18px] shrink-0" />{!collapsed && item.label}
            </Link>;
          })}
        </nav>
        <div className="mt-auto space-y-2">
          {!collapsed && <div className="rounded-xl border border-[var(--line)] bg-slate-500/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Sparkles className="size-3.5 text-[var(--brand)]" />AI Career OS</div><p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{mockMode ? "Demo services active" : "OpenAI + Supabase connected"}</p></div>}
          {!mockMode && !collapsed && <ReportIssueButton pagePath={pathname} />}
          <button onClick={toggleTheme} className={cn("flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--muted)] hover:bg-slate-500/8", collapsed && "justify-center px-0")} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}{!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}</button>
          <button onClick={() => void logout()} className={cn("flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--muted)] hover:bg-rose-500/8 hover:text-rose-500", collapsed && "justify-center px-0")} aria-label="Log out"><LogOut className="size-4" />{!collapsed && "Log out"}</button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 backdrop-blur-xl lg:hidden">
        <BrandMark />
        <div className="flex items-center gap-2">
          {isAdmin && <Link href="/admin" className="grid size-10 place-items-center rounded-xl border border-[var(--brand)] bg-[var(--brand)] text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]" aria-label="Open Admin" title="Open Admin"><ShieldCheck className="size-5" /></Link>}
          <button onClick={toggleTheme} className="grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--foreground)]" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>{theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}</button>
          <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-2" aria-label="Open navigation"><Menu className="size-5" /></button>
        </div>
      </header>

      {mobileOpen && <div className="motion-backdrop fixed inset-0 z-50 lg:hidden">
        <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
        <aside className="motion-drawer absolute inset-y-0 left-0 w-[86%] max-w-sm border-r border-[var(--line)] bg-[var(--card)] p-4 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><BrandMark /><button onClick={() => setMobileOpen(false)} className="rounded-lg p-2" aria-label="Close navigation"><X className="size-5" /></button></div>
          <nav className="space-y-1" aria-label="Primary navigation">{visibleNavItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium", active ? "nav-active bg-[var(--brand)] text-white" : "text-[var(--muted)]")}><Icon className="size-[18px]" />{item.label}</Link>; })}</nav>
          {!mockMode && <div className="mt-4"><ReportIssueButton pagePath={pathname} /></div>}
          <Button variant="secondary" className="mt-6 w-full" onClick={toggleTheme}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</Button>
          <Button variant="secondary" className="mt-2 w-full" onClick={() => void logout()}><LogOut className="size-4" />Log out</Button>
        </aside>
      </div>}

      <div className={cn("transition-all", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <div className="hidden h-16 items-center justify-between border-b border-[var(--line)] px-8 lg:flex">
          <div className="flex items-center gap-3"><Badge tone={mockMode ? "warning" : "success"}>{mockMode ? "Demo mode" : "Live services"}</Badge><span className="text-xs text-[var(--muted)]">Learn → Practice → Test → Build → Prove</span></div>
          <div className="flex items-center gap-3">{isAdmin && <Link href="/admin" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]" aria-label="Open Admin"><ShieldCheck className="size-4" />Admin</Link>}<button onClick={toggleTheme} className="grid size-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--foreground)]" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>{theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}</button><div className="text-right"><p className="text-sm font-semibold">{state.profile.name}</p><p className="text-xs text-[var(--muted)]">{state.profile.primaryGoal}</p></div><div className="grid size-10 place-items-center rounded-xl bg-violet-500/12 text-[var(--brand)]"><UserRound className="size-5" /></div></div>
        </div>
        <main className="app-page mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
      <OpportunityAlert />
    </div>
  </RequireAuth>;
}
