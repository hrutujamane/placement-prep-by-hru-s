"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  MapPin,
  PartyPopper,
  Plus,
  Radio,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { officialCareerPortals, type LiveOpportunity, type OpportunityFeedResponse, type OpportunitySourceStatus } from "@/lib/job-opportunities";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { JobApplication } from "@/lib/types";
import { Badge, Button, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";

const statuses: JobApplication["status"][] = ["Interested", "Applied", "Assessment", "Interview", "Offer", "Rejected"];
const statusTone = { Interested: "neutral", Applied: "brand", Assessment: "warning", Interview: "warning", Offer: "success", Rejected: "danger" } as const;
const seenStorageKey = "placement-prep-seen-opportunities-v1";
const alertsStorageKey = "placement-prep-opportunity-alerts-v1";
const pollIntervalMs = 10 * 60_000;

type NotificationState = NotificationPermission | "unsupported";

export function JobsPage() {
  const { state, addJob, updateJob } = useApp();
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(state.jobs.some((job) => job.status === "Offer"));
  const [form, setForm] = useState<Omit<JobApplication, "id">>({ company: "", role: "", url: "", deadline: "", status: "Interested", notes: "" });
  const [opportunities, setOpportunities] = useState<LiveOpportunity[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<OpportunitySourceStatus[]>([]);
  const [newOpportunityIds, setNewOpportunityIds] = useState<string[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const [opportunityError, setOpportunityError] = useState("");
  const [notice, setNotice] = useState("");
  const [feedStale, setFeedStale] = useState(false);
  const [lastChecked, setLastChecked] = useState("");
  const [query, setQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [kind, setKind] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationState>("default");
  const alertsEnabledRef = useRef(false);

  const loadOpportunities = useCallback(async () => {
    setLoadingOpportunities(true);
    setOpportunityError("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/opportunities", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      const payload = await response.json() as OpportunityFeedResponse | { error?: string };
      if (!response.ok || !("opportunities" in payload)) {
        const message = "error" in payload ? payload.error : undefined;
        throw new Error(message || "Live opportunities could not be loaded.");
      }

      const previousRaw = window.localStorage.getItem(seenStorageKey);
      const previousIds = new Set<string>(previousRaw ? JSON.parse(previousRaw) as string[] : []);
      const fresh = previousRaw ? payload.opportunities.filter((opportunity) => !previousIds.has(opportunity.id)) : [];
      const retainedIds = Array.from(new Set([...payload.opportunities.map((opportunity) => opportunity.id), ...previousIds])).slice(0, 500);
      window.localStorage.setItem(seenStorageKey, JSON.stringify(retainedIds));

      setOpportunities(payload.opportunities);
      setSourceStatuses(payload.sources);
      setNewOpportunityIds(fresh.map((opportunity) => opportunity.id));
      setLastChecked(payload.fetchedAt);
      setNotice(payload.notice);
      setFeedStale(payload.stale);

      if (fresh.length && alertsEnabledRef.current && "Notification" in window && Notification.permission === "granted") {
        const example = fresh[0];
        new Notification(`${fresh.length} new engineering ${fresh.length === 1 ? "opportunity" : "opportunities"}`, {
          body: `${example.company}: ${example.role}${fresh.length > 1 ? ` and ${fresh.length - 1} more` : ""}`,
          icon: "/favicon.png",
          tag: "placement-prep-opportunities",
        });
      }
    } catch (error) {
      setOpportunityError(error instanceof Error ? error.message : "Live opportunities could not be loaded.");
    } finally {
      setLoadingOpportunities(false);
    }
  }, []);

  useEffect(() => {
    const supported = "Notification" in window;
    const savedPreference = window.localStorage.getItem(alertsStorageKey) === "enabled";
    alertsEnabledRef.current = supported && savedPreference && Notification.permission === "granted";
    const setupTimer = window.setTimeout(() => {
      setNotificationState(supported ? Notification.permission : "unsupported");
      setAlertsEnabled(alertsEnabledRef.current);
      void loadOpportunities();
    }, 0);
    const interval = window.setInterval(() => void loadOpportunities(), pollIntervalMs);
    return () => {
      window.clearTimeout(setupTimer);
      window.clearInterval(interval);
    };
  }, [loadOpportunities]);

  const trackedUrls = useMemo(() => new Set(state.jobs.map((job) => job.url ? normaliseUrl(job.url) : "").filter(Boolean)), [state.jobs]);
  const filteredOpportunities = useMemo(() => {
    const text = query.trim().toLowerCase();
    const location = locationQuery.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      const matchesText = !text || `${opportunity.company} ${opportunity.role} ${opportunity.tags.join(" ")}`.toLowerCase().includes(text);
      const matchesLocation = !location || opportunity.location.toLowerCase().includes(location);
      const matchesKind = kind === "All" || opportunity.kind === kind;
      return matchesText && matchesLocation && matchesKind;
    });
  }, [kind, locationQuery, opportunities, query]);
  const visibleOpportunities = showAll ? filteredOpportunities : filteredOpportunities.slice(0, 12);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.company || !form.role) return;
    addJob(form);
    setOpen(false);
    setForm({ company: "", role: "", url: "", deadline: "", status: "Interested", notes: "" });
  }

  function trackOpportunity(opportunity: LiveOpportunity) {
    if (trackedUrls.has(normaliseUrl(opportunity.applyUrl))) return;
    addJob({
      company: opportunity.company,
      role: opportunity.role,
      url: opportunity.applyUrl,
      jobDescription: `${opportunity.kind} · ${opportunity.location}`,
      status: "Interested",
      notes: `Discovered from ${opportunity.sourceLabel}. Verify eligibility, location, deadline and availability on the employer page.`,
    });
    setTrackingMessage(`${opportunity.role} was added to your application pipeline.`);
  }

  async function enableBrowserAlerts() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    if (permission === "granted") {
      window.localStorage.setItem(alertsStorageKey, "enabled");
      alertsEnabledRef.current = true;
      setAlertsEnabled(true);
      new Notification("Placement Prep alerts enabled", { body: "You will be alerted when a newly published role appears while this page is open.", icon: "/favicon.png" });
    }
  }

  function pauseBrowserAlerts() {
    window.localStorage.setItem(alertsStorageKey, "paused");
    alertsEnabledRef.current = false;
    setAlertsEnabled(false);
  }

  return <AppShell>
    <PageHeader
      eyebrow="Applications"
      title={placed ? "Offer received. Prepare for day one." : "Find real roles. Track every application."}
      description={placed ? "Your career journey now includes a practical First 90 Days preparation path." : "Check published company opportunities, open the official application page and keep your next action organized."}
      action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPlaced(true)}><PartyPopper className="size-4" />I got placed</Button><Button onClick={() => setOpen(true)}><Plus className="size-4" />Add application</Button></div>}
    />

    {placed && <section className="mb-6 overflow-hidden rounded-[1.6rem] border border-emerald-500/25 bg-gradient-to-r from-emerald-500/12 to-violet-500/10 p-6 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><Badge tone="success"><Rocket className="mr-1 size-3.5" />First 90 Days</Badge><h2 className="mt-4 text-2xl font-bold">Move from placement-ready to team-ready.</h2><p className="mt-2 text-sm text-[var(--muted)]">Revise technical foundations, Git, Linux, documentation, team communication and role-specific tools.</p></div><Button>Open 90-day plan <ArrowRight className="size-4" /></Button></div><div className="mt-6 grid gap-3 sm:grid-cols-4">{["Before joining", "Days 1–30", "Days 31–60", "Days 61–90"].map((stage, index) => <div key={stage} className="rounded-xl border border-[var(--line)] bg-[var(--card)]/65 p-4"><span className="text-xs font-bold text-[var(--brand-strong)]">0{index + 1}</span><p className="mt-3 text-sm font-semibold">{stage}</p></div>)}</div></section>}

    <section className="card overflow-hidden" aria-labelledby="live-opportunities-heading">
      <div className="border-b border-[var(--line)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Badge tone="success"><Radio className="mr-1 size-3.5" />Official public feeds</Badge>{newOpportunityIds.length > 0 && <Badge tone="warning">{newOpportunityIds.length} new since last check</Badge>}</div>
            <h2 id="live-opportunities-heading" className="mt-3 text-xl font-bold">Live opportunity alerts</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">Internships, graduate openings and relevant engineering roles published on monitored company job boards.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" loading={loadingOpportunities} onClick={() => void loadOpportunities()}><RefreshCcw className="size-4" />Check now</Button>
            {alertsEnabled
              ? <Button variant="secondary" size="sm" onClick={pauseBrowserAlerts}><BellOff className="size-4" />Pause browser alerts</Button>
              : <Button size="sm" onClick={() => void enableBrowserAlerts()} disabled={notificationState === "denied" || notificationState === "unsupported"}><Bell className="size-4" />Enable browser alerts</Button>}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_.8fr_.7fr]">
          <label className="relative"><span className="sr-only">Search company or role</span><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[var(--muted)]" /><Input className="pl-10" value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Search role, company or skill" /></label>
          <label className="relative"><span className="sr-only">Filter by location</span><MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[var(--muted)]" /><Input className="pl-10" value={locationQuery} onChange={(event) => { setLocationQuery(event.target.value); setShowAll(false); }} placeholder="Location, e.g. India or Remote" /></label>
          <Select aria-label="Filter opportunity type" value={kind} onChange={(event) => { setKind(event.target.value); setShowAll(false); }}><option>All</option><option>Internship</option><option>Graduate / apprentice</option><option>Job</option></Select>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${feedStale ? "text-amber-500" : "text-[var(--muted)]"}`}>
          {feedStale ? <CircleAlert className="size-4" /> : <ShieldCheck className="size-4 text-emerald-500" />}
          <span>{notice || "Application links are validated against the monitored company or job-board domain."}</span>
          {lastChecked && <span>Last checked {formatDateTime(lastChecked)}.</span>}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Browser alerts require permission and work while this application page is open. This is not a background push service. Never pay a fee to apply.</p>
        {notificationState === "denied" && <p className="mt-2 text-xs text-amber-500">Notifications are blocked in this browser. You can re-enable them from the site permissions menu.</p>}
      </div>

      <div className="p-5 sm:p-6">
        {sourceStatuses.length > 0 && <div className="mb-5 flex flex-wrap gap-2" aria-label="Live feed status">{sourceStatuses.map((source) => <Badge key={source.company} tone={source.status === "live" ? "success" : "warning"}>{source.company}: {source.status === "live" ? `${source.count} matched` : "temporarily unavailable"}</Badge>)}</div>}
        {opportunityError && <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-500"><CircleAlert className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Could not refresh official feeds</p><p className="mt-1">{opportunityError}</p></div></div>}
        {trackingMessage && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-sm text-emerald-500" role="status"><CheckCircle2 className="size-4" />{trackingMessage}</div>}

        {loadingOpportunities && !opportunities.length
          ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl border border-[var(--line)] bg-slate-500/5" />)}</div>
          : visibleOpportunities.length
            ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleOpportunities.map((opportunity) => {
              const tracked = trackedUrls.has(normaliseUrl(opportunity.applyUrl));
              const isNew = newOpportunityIds.includes(opportunity.id);
              return <article key={opportunity.id} className="flex min-h-64 flex-col rounded-2xl border border-[var(--line)] bg-[var(--background)] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)] hover:shadow-xl hover:shadow-black/5">
                <div className="flex items-start justify-between gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><Building2 className="size-5" /></div><div className="flex flex-wrap justify-end gap-1.5">{isNew && <Badge tone="warning">New</Badge>}<Badge tone={opportunity.kind === "Internship" ? "success" : "neutral"}>{opportunity.kind}</Badge></div></div>
                <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-[var(--brand-strong)]">{opportunity.company}</p>
                <h3 className="mt-2 text-base font-bold leading-6">{opportunity.role}</h3>
                <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted)]"><MapPin className="mt-0.5 size-4 shrink-0" />{opportunity.location}</p>
                {opportunity.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{opportunity.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-500/8 px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">{tag}</span>)}</div>}
                <div className="mt-auto pt-5">
                  <p className="mb-3 text-[11px] text-[var(--muted)]">{opportunity.updatedAt ? `Board updated ${formatDate(opportunity.updatedAt)}` : "Currently published on the company board"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => trackOpportunity(opportunity)} disabled={tracked}>{tracked ? <><Check className="size-4" />Tracked</> : <><Plus className="size-4" />Track</>}</Button>
                    <a className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]" href={opportunity.applyUrl} target="_blank" rel="noopener noreferrer">Apply <ExternalLink className="size-4" /></a>
                  </div>
                </div>
              </article>;
            })}</div>
            : !loadingOpportunities && <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center"><Search className="mx-auto size-8 text-[var(--muted)]" /><h3 className="mt-4 font-bold">No matching published roles</h3><p className="mt-2 text-sm text-[var(--muted)]">Try a broader role or clear the location filter. You can also open the official company portals below.</p></div>}
        {filteredOpportunities.length > 12 && <div className="mt-5 flex justify-center"><Button variant="secondary" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show fewer roles" : `Show all ${filteredOpportunities.length} roles`}</Button></div>}
      </div>
    </section>

    <section className="mt-6 card p-5 sm:p-6">
      <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500"><ExternalLink className="size-5" /></div><div><h2 className="font-bold">Official career portals</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">These major-company sites are verified destinations, but are not automatically monitored by this app. Open them to search current India and global vacancies.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{officialCareerPortals.map((portal) => <a key={portal.company} href={portal.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-[var(--line)] p-4 transition hover:border-[var(--brand)] hover:bg-violet-500/5"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{portal.company}</p><ExternalLink className="size-4 text-[var(--muted)] transition group-hover:text-[var(--brand)]" /></div><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{portal.focus}</p></a>)}</div>
    </section>

    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statuses.slice(0, 4).map((status) => <div key={status} className="card p-4"><p className="text-xs text-[var(--muted)]">{status}</p><p className="mt-2 text-3xl font-bold">{state.jobs.filter((job) => job.status === status).length}</p></div>)}</section>

    <section className="mt-6 card overflow-hidden"><div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-bold">Application pipeline</h2><p className="mt-1 text-xs text-[var(--muted)]">Opening an application link never changes its status automatically. Update it only after you actually apply.</p></div><div className="divide-y divide-[var(--line)]">{state.jobs.map((job) => <article key={job.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_.9fr_.7fr_auto] lg:items-center"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><BriefcaseBusiness className="size-5" /></div><div><p className="font-semibold">{job.company}</p><p className="mt-1 text-sm text-[var(--muted)]">{job.role}</p></div></div><div>{job.deadline ? <p className="flex items-center gap-2 text-sm"><CalendarClock className="size-4 text-[var(--muted)]" />Deadline {job.deadline}</p> : <p className="text-sm text-[var(--muted)]">No deadline recorded</p>} {job.notes && <p className="mt-1 text-xs text-[var(--muted)]">{job.notes}</p>}</div><Select aria-label={`Application status for ${job.company}`} value={job.status} onChange={(event) => updateJob(job.id, event.target.value as JobApplication["status"])} className="h-9">{statuses.map((status) => <option key={status}>{status}</option>)}</Select><div className="flex items-center gap-2"><Badge tone={statusTone[job.status]}>{job.status}</Badge>{job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${job.company} job`}><ExternalLink className="size-4 text-[var(--muted)]" /></a>}</div></article>)}{state.jobs.length === 0 && <div className="p-8 text-center text-sm text-[var(--muted)]">No tracked applications yet. Add one manually or track a live opportunity above.</div>}</div></section>

    {open && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-xl rounded-[1.5rem] border border-[var(--line)] bg-[var(--background)] p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">New opportunity</p><h2 className="mt-1 text-xl font-bold">Add an application</h2></div><button type="button" aria-label="Close application form" onClick={() => setOpen(false)} className="rounded-xl p-2"><X className="size-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="job-company">Company</Label><Input id="job-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} required /></div><div><Label htmlFor="job-role">Role</Label><Input id="job-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></div><div><Label htmlFor="job-url">Job URL</Label><Input id="job-url" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></div><div><Label htmlFor="job-deadline">Deadline</Label><Input id="job-deadline" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="job-status">Status</Label><Select id="job-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as JobApplication["status"] })}>{statuses.map((status) => <option key={status}>{status}</option>)}</Select></div><div className="sm:col-span-2"><Label htmlFor="job-notes">Notes</Label><Textarea id="job-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div></div><div className="mt-6 flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button>Add application <Check className="size-4" /></Button></div></form></div>}
  </AppShell>;
}

function normaliseUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
