"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, BriefcaseBusiness, Check, ExternalLink, MapPin, Sparkles, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui";
import { matchOpportunityTagsForProfile, rankOpportunitiesForProfile, scoreOpportunityForProfile, type LiveOpportunity, type OpportunityFeedResponse } from "@/lib/job-opportunities";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const preferenceStorageKey = "placement-prep-vacancy-popups-v1";
const seenStorageKey = "placement-prep-vacancy-popup-seen-v1";
const refreshIntervalMs = 10 * 60_000;

export function OpportunityAlert() {
  const { state, addJob } = useApp();
  const [candidate, setCandidate] = useState<LiveOpportunity | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trackedFromPopup, setTrackedFromPopup] = useState(false);
  const enabledRef = useRef(true);

  const profile = useMemo(() => ({
    targetRoles: state.profile.targetRoles,
    targetCompanies: state.profile.targetCompanies,
    existingSkills: state.profile.existingSkills,
  }), [state.profile.existingSkills, state.profile.targetCompanies, state.profile.targetRoles]);
  const trackedUrls = useMemo(() => new Set(state.jobs.map((job) => job.url ? normaliseUrl(job.url) : "").filter(Boolean)), [state.jobs]);

  const markPendingAsSeen = useCallback((ids: string[]) => {
    const existing = readStoredIds();
    const combined = Array.from(new Set([...ids, ...existing])).slice(0, 500);
    window.localStorage.setItem(seenStorageKey, JSON.stringify(combined));
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/opportunities", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json() as OpportunityFeedResponse;
      const untracked = payload.opportunities.filter((opportunity) => !trackedUrls.has(normaliseUrl(opportunity.applyUrl)));
      if (!untracked.length) return;

      const ranked = rankOpportunitiesForProfile(untracked, profile);
      const domainMatches = ranked.filter((opportunity) => matchOpportunityTagsForProfile(opportunity, profile).length > 0);
      const alertCandidates = domainMatches.length ? domainMatches : ranked;
      const storedValue = window.localStorage.getItem(seenStorageKey);
      const seen = new Set(readStoredIds());
      const unseen = storedValue === null ? alertCandidates.slice(0, 1) : alertCandidates.filter((opportunity) => !seen.has(opportunity.id));
      const bestCandidate = unseen[0] ?? alertCandidates[0];
      const idsInBatch = storedValue === null ? payload.opportunities.map((opportunity) => opportunity.id) : unseen.map((opportunity) => opportunity.id);

      setCandidate(bestCandidate);
      setPendingIds(idsInBatch);
      setUnreadCount(unseen.length);
      setTrackedFromPopup(false);

      if (unseen.length && enabledRef.current) {
        markPendingAsSeen(idsInBatch);
        setPopupOpen(true);
      }
    } catch {
      // Global alerts stay quiet when a live source is temporarily unavailable.
      // The Applications page retains the visible retry and stale-data controls.
    }
  }, [markPendingAsSeen, profile, trackedUrls]);

  useEffect(() => {
    const savedPreference = window.localStorage.getItem(preferenceStorageKey) !== "paused";
    enabledRef.current = savedPreference;
    const startTimer = window.setTimeout(() => {
      setEnabled(savedPreference);
      void loadAlerts();
    }, 900);
    const interval = window.setInterval(() => void loadAlerts(), refreshIntervalMs);
    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  function dismissPopup() {
    if (pendingIds.length) markPendingAsSeen(pendingIds);
    setUnreadCount(0);
    setPopupOpen(false);
  }

  function pausePopups() {
    window.localStorage.setItem(preferenceStorageKey, "paused");
    enabledRef.current = false;
    setEnabled(false);
    setPopupOpen(false);
  }

  function openAlerts() {
    if (!enabled) {
      window.localStorage.setItem(preferenceStorageKey, "enabled");
      enabledRef.current = true;
      setEnabled(true);
    }
    if (pendingIds.length) markPendingAsSeen(pendingIds);
    setUnreadCount(0);
    if (candidate) setPopupOpen(true);
  }

  function trackCandidate() {
    if (!candidate || trackedUrls.has(normaliseUrl(candidate.applyUrl))) return;
    addJob({
      company: candidate.company,
      role: candidate.role,
      url: candidate.applyUrl,
      jobDescription: `${candidate.kind} · ${candidate.location}`,
      status: "Interested",
      notes: `Added from a vacancy alert using ${candidate.sourceLabel}. Verify eligibility, location, deadline and availability on the employer page.`,
    });
    setTrackedFromPopup(true);
  }

  if (!candidate) return null;
  const alreadyTracked = trackedFromPopup || trackedUrls.has(normaliseUrl(candidate.applyUrl));
  const matchReason = getMatchReason(candidate, profile);

  return <>
    {popupOpen && <aside
      className="motion-dialog fixed bottom-4 right-4 z-[55] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-[1.4rem] border border-[var(--brand)]/30 bg-[color-mix(in_srgb,var(--card)_96%,transparent)] shadow-2xl shadow-black/20 backdrop-blur-xl sm:bottom-6 sm:right-6"
      aria-label="New vacancy alert"
      aria-live="polite"
      data-testid="vacancy-alert-popup"
    >
      <div className="relative overflow-hidden border-b border-[var(--line)] bg-gradient-to-r from-violet-500/12 to-amber-500/10 p-5">
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-[var(--brand)]/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-lg shadow-violet-500/20"><Bell className="size-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--brand-strong)]">New vacancy match</p><p className="mt-1 text-xs text-[var(--muted)]">From an official public company board</p></div></div>
          <button className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-slate-500/10 hover:text-[var(--foreground)]" onClick={dismissPopup} aria-label="Dismiss vacancy alert"><X className="size-4" /></button>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--brand-strong)]">{candidate.company}</p>
        <h2 className="mt-2 text-lg font-bold leading-6">{candidate.role}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-[var(--muted)]"><MapPin className="mt-0.5 size-4 shrink-0" />{candidate.location}</p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--line)] bg-slate-500/5 p-3 text-xs leading-5 text-[var(--muted)]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" /><span><strong className="text-[var(--foreground)]">Why it appeared:</strong> {matchReason}</span></div>
        {unreadCount > 1 && <p className="mt-3 text-xs text-[var(--muted)]">There are {unreadCount - 1} more newly published matches in Applications.</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={trackCandidate} disabled={alreadyTracked}>{alreadyTracked ? <><Check className="size-4" />Tracked</> : <><BriefcaseBusiness className="size-4" />Track</>}</Button>
          <a className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:bg-[var(--brand-strong)]" href={candidate.applyUrl} target="_blank" rel="noopener noreferrer">View job <ExternalLink className="size-4" /></a>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs">
          <Link href="/jobs" onClick={dismissPopup} className="font-semibold text-[var(--brand-strong)] hover:underline">See all opportunities</Link>
          <button onClick={pausePopups} className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"><BellOff className="size-3.5" />Pause popups</button>
        </div>
      </div>
    </aside>}

    {!popupOpen && <button
      className="fixed bottom-4 right-4 z-[45] grid size-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--card)] text-[var(--brand)] shadow-xl shadow-black/15 transition hover:-translate-y-1 hover:border-[var(--brand)] sm:bottom-6 sm:right-6"
      onClick={openAlerts}
      aria-label={enabled ? `Open vacancy alerts${unreadCount ? `, ${unreadCount} unread` : ""}` : "Enable vacancy popup alerts"}
      title={enabled ? "Vacancy alerts" : "Vacancy popups paused"}
    >
      {enabled ? <Bell className="size-5" /> : <BellOff className="size-5 text-[var(--muted)]" />}
      {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>}
  </>;
}

function getMatchReason(opportunity: LiveOpportunity, profile: { targetRoles: string[]; targetCompanies: string[]; existingSkills: string[] }) {
  const score = scoreOpportunityForProfile(opportunity, profile);
  const matchedTags = matchOpportunityTagsForProfile(opportunity, profile);
  if (matchedTags.length) return `It connects with your saved ${matchedTags[0]} target or skills and is currently published by ${opportunity.company}.`;
  if (opportunity.kind !== "Job") return `It is a ${opportunity.kind.toLowerCase()} opening related to your engineering preparation.`;
  if (score > 0) return "Its role keywords overlap with your target roles or saved skills.";
  return "It is a newly published engineering role from a monitored company board.";
}

function readStoredIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seenStorageKey) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string").slice(0, 500) : [];
  } catch {
    return [];
  }
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

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
