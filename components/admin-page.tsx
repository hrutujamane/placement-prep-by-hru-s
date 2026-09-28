"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell, RequireAuth } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  confirmedAt: string | null;
  displayName: string | null;
};

export function AdminPage() {
  const { isAdmin, mockMode } = useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (mockMode || !isAdmin) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase!.auth.getSession();
      if (!data.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      const payload = await response.json() as { users?: Account[]; fetchedAt?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Account records could not be loaded.");
      setAccounts(payload.users ?? []); setFetchedAt(payload.fetchedAt ?? null);
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

  return <RequireAuth><AppShell>
    <PageHeader eyebrow="Administrator" title="Account activity" description="See who created a real Supabase account and their most recently recorded sign-in. This is not a live-presence tracker, and no passwords, tokens or resume data are shown." action={<Button variant="secondary" onClick={() => void loadAccounts()} loading={loading}><RefreshCw className="size-4" />Refresh</Button>} />

    {mockMode ? <EmptyState icon={<ShieldCheck className="size-6" />} title="Admin reporting needs live mode" description="Demo accounts exist only in the current browser, so they cannot be safely listed here. Connect Supabase and set NEXT_PUBLIC_USE_MOCK_SERVICES=false to view real account records." /> : !isAdmin ? <EmptyState icon={<ShieldCheck className="size-6" />} title="Administrator access required" description="This account is not allowed to view student account records." /> : <>
      {error && <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-600 dark:text-rose-300"><AlertCircle className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">Account records could not be loaded</p><p className="mt-1 leading-6">{error}</p></div></div>}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Registered accounts" value={stats.total} />
        <Metric label="Accounts with a sign-in" value={stats.signedIn} />
        <Metric label="Created in the last 30 days" value={stats.newThisMonth} />
      </section>
      <section className="card mt-6 overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Registered accounts</h2><p className="mt-1 text-xs text-[var(--muted)]">Created and last sign-in timestamps come directly from Supabase Auth.</p></div>{fetchedAt && <Badge tone="success"><CheckCircle2 className="mr-1 size-3.5" />Updated {formatDateTime(fetchedAt)}</Badge>}</div>
        {loading ? <div className="p-10 text-center text-sm text-[var(--muted)]">Loading protected account records…</div> : accounts.length === 0 ? <div className="p-10 text-center text-sm text-[var(--muted)]">No Supabase accounts have been created yet.</div> : <div className="divide-y divide-[var(--line)]">{accounts.map((account) => <article key={account.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-semibold">{account.displayName || account.email}</p>{account.displayName && <p className="mt-1 truncate text-sm text-[var(--muted)]">{account.email}</p>}<p className="mt-2 text-xs text-[var(--muted)]">Created {formatDateTime(account.createdAt)}</p></div><Badge tone={account.confirmedAt ? "success" : "warning"}>{account.confirmedAt ? "Email confirmed" : "Pending confirmation"}</Badge><div className="text-sm sm:text-right"><p className="font-medium">{account.lastSignInAt ? formatDateTime(account.lastSignInAt) : "No recorded sign-in"}</p><p className="mt-1 text-xs text-[var(--muted)]">Last sign-in</p></div></article>)}</div>}
      </section>
    </>}
  </AppShell></RequireAuth>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="card p-5"><div className="flex items-center justify-between"><p className="text-sm text-[var(--muted)]">{label}</p><UsersRound className="size-5 text-[var(--brand)]" /></div><p className="mt-3 text-3xl font-bold">{value}</p></div>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
