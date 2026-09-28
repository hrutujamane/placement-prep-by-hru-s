"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Flag, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell, RequireAuth } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, EmptyState, PageHeader, Select, Textarea } from "@/components/ui";
import { reportStatuses } from "@/lib/student-reports";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  confirmedAt: string | null;
  displayName: string | null;
};

type StudentReport = {
  id: string; email: string; category: string; message: string; pagePath: string; status: (typeof reportStatuses)[number]; adminNote: string | null; createdAt: string; updatedAt: string;
};

export function AdminPage() {
  const { isAdmin, mockMode } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (mockMode || !isAdmin) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase!.auth.getSession();
      if (!data.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const headers = { Authorization: `Bearer ${data.session.access_token}` };
      const [accountsResponse, reportsResponse] = await Promise.all([fetch("/api/admin/users", { headers, cache: "no-store" }), fetch("/api/admin/reports", { headers, cache: "no-store" })]);
      const accountsPayload = await accountsResponse.json() as { users?: Account[]; fetchedAt?: string; error?: string };
      const reportsPayload = await reportsResponse.json() as { reports?: StudentReport[]; error?: string };
      if (!accountsResponse.ok) throw new Error(accountsPayload.error ?? "Account records could not be loaded.");
      if (!reportsResponse.ok) throw new Error(reportsPayload.error ?? "Student reports could not be loaded.");
      setAccounts(accountsPayload.users ?? []); setReports(reportsPayload.reports ?? []); setFetchedAt(accountsPayload.fetchedAt ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Account records could not be loaded.");
    } finally { setLoading(false); }
  }, [isAdmin, mockMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAccounts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  const stats = useMemo(() => {
    const recentThreshold = (fetchedAt ? new Date(fetchedAt).getTime() : 0) - 30 * 24 * 60 * 60 * 1_000;
    return {
      total: accounts.length,
      signedIn: accounts.filter((account) => account.lastSignInAt).length,
      newThisMonth: accounts.filter((account) => new Date(account.createdAt).getTime() >= recentThreshold).length,
    };
  }, [accounts, fetchedAt]);

  async function updateReport(report: StudentReport, status: StudentReport["status"], adminNote = report.adminNote ?? "") {
    setSavingReportId(report.id); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase!.auth.getSession();
      const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ id: report.id, status, adminNote }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The report update could not be saved.");
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status, adminNote: adminNote || null } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The report update could not be saved."); }
    finally { setSavingReportId(null); }
  }

  return <RequireAuth><AppShell>
    <PageHeader eyebrow="Administrator" title="Student support & account activity" description="Review what students report, mark each issue as it progresses, and check real account activity. No passwords, tokens, resumes or private project files are exposed." action={<Button variant="secondary" onClick={() => void loadAccounts()} loading={loading}><RefreshCw className="size-4" />Refresh</Button>} />

    {mockMode ? <EmptyState icon={<ShieldCheck className="size-6" />} title="Admin reporting needs live mode" description="Demo accounts exist only in the current browser, so they cannot be safely listed here. Connect Supabase and set NEXT_PUBLIC_USE_MOCK_SERVICES=false to view real account records." /> : !isAdmin ? <EmptyState icon={<ShieldCheck className="size-6" />} title="Administrator access required" description="This account is not allowed to view student account records." /> : <>
      {error && <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-600 dark:text-rose-300"><AlertCircle className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">Account records could not be loaded</p><p className="mt-1 leading-6">{error}</p></div></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered accounts" value={stats.total} />
        <Metric label="Accounts with a sign-in" value={stats.signedIn} />
        <Metric label="Created in the last 30 days" value={stats.newThisMonth} />
        <Metric label="Open student reports" value={reports.filter((report) => report.status !== "Resolved").length} icon={<Flag className="size-5 text-[var(--brand)]" />} />
      </section>
      <section className="card mt-6 overflow-hidden"><div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Student reports</h2><p className="mt-1 text-xs text-[var(--muted)]">These are written directly by students using the Report a problem button. They are not AI assumptions.</p></div><div className="flex gap-2">{reportStatuses.map((status) => <Badge key={status} tone={status === "Resolved" ? "success" : status === "In review" ? "warning" : "danger"}>{reports.filter((report) => report.status === status).length} {status}</Badge>)}</div></div>{loading ? <div className="p-10 text-center text-sm text-[var(--muted)]">Loading student reportsâ€¦</div> : reports.length === 0 ? <div className="p-10 text-center text-sm text-[var(--muted)]">No student reports yet. Students can send one from the Report a problem button in the sidebar.</div> : <div className="divide-y divide-[var(--line)]">{reports.map((report) => <article key={report.id} className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{report.category}</Badge><Badge tone={report.status === "Resolved" ? "success" : report.status === "In review" ? "warning" : "danger"}>{report.status}</Badge></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{report.message}</p><p className="mt-3 text-xs text-[var(--muted)]">{report.email} · {report.pagePath} · Reported {formatDateTime(report.createdAt)}</p></div><div className="w-full sm:w-44"><Select aria-label={`Status for report from ${report.email}`} value={report.status} disabled={savingReportId === report.id} onChange={(event) => void updateReport(report, event.target.value as StudentReport["status"])}>{reportStatuses.map((status) => <option key={status}>{status}</option>)}</Select></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Textarea aria-label={`Admin note for report from ${report.email}`} className="min-h-20" defaultValue={report.adminNote ?? ""} placeholder="Optional note for your own follow-up" onBlur={(event) => { if (event.target.value !== (report.adminNote ?? "")) void updateReport(report, report.status, event.target.value); }} /><p className="text-xs text-[var(--muted)] sm:w-36">Notes save when you click away.</p></div></article>)}</div>}</section>
      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Registered accounts</h2><p className="mt-1 text-xs text-[var(--muted)]">Created and last sign-in timestamps come directly from Supabase Auth.</p></div>{fetchedAt && <Badge tone="success"><CheckCircle2 className="mr-1 size-3.5" />Updated {formatDateTime(fetchedAt)}</Badge>}</div>
        {loading ? <div className="p-10 text-center text-sm text-[var(--muted)]">Loading protected account records…</div> : accounts.length === 0 ? <div className="p-10 text-center text-sm text-[var(--muted)]">No Supabase accounts have been created yet.</div> : <div className="divide-y divide-[var(--line)]">{accounts.map((account) => <article key={account.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-semibold">{account.displayName || account.email}</p>{account.displayName && <p className="mt-1 truncate text-sm text-[var(--muted)]">{account.email}</p>}<p className="mt-2 text-xs text-[var(--muted)]">Created {formatDateTime(account.createdAt)}</p></div><Badge tone={account.confirmedAt ? "success" : "warning"}>{account.confirmedAt ? "Email confirmed" : "Pending confirmation"}</Badge><div className="text-sm sm:text-right"><p className="font-medium">{account.lastSignInAt ? formatDateTime(account.lastSignInAt) : "No recorded sign-in"}</p><p className="mt-1 text-xs text-[var(--muted)]">Last sign-in</p></div></article>)}</div>}
      </section>
    </>}
  </AppShell></RequireAuth>;
}

function Metric({ label, value, icon = <UsersRound className="size-5 text-[var(--brand)]" /> }: { label: string; value: number; icon?: React.ReactNode }) {
  return <div className="card p-5"><div className="flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{label}</p>{icon}</div><p className="mt-3 text-3xl font-bold">{value}</p></div>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
