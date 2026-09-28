"use client";

import { useState } from "react";
import { Bookmark, Check, ExternalLink, Filter, LibraryBig, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { verifiedResources } from "@/lib/demo-data";
import { Badge, Button, Input, PageHeader } from "@/components/ui";

export function ResourcesPage() {
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const resources = verifiedResources.filter((resource) => `${resource.title} ${resource.provider} ${resource.topics}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell>
    <PageHeader eyebrow="Learning resources" title="A few verified resources, chosen for your goal." description="Current links are verified against official providers. Course schedules, exam fees and availability may change—always confirm on the source page." />
    <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources and topics" className="pl-9" /></div><Button variant="secondary"><Filter className="size-4" />Free first</Button></div>
    <section className="grid gap-5 lg:grid-cols-3">{resources.map((resource) => <article key={resource.url} className="card flex flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)]"><LibraryBig className="size-5" /></div><Badge tone="success"><ShieldCheck className="mr-1 size-3" />Verified link</Badge></div><h2 className="mt-5 text-lg font-bold">{resource.title}</h2><p className="mt-1 text-sm font-medium text-[var(--brand-strong)]">{resource.provider}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-slate-500/6 p-3"><p className="text-[var(--muted)]">Level</p><p className="mt-1 font-semibold">{resource.level}</p></div><div className="rounded-xl bg-slate-500/6 p-3"><p className="text-[var(--muted)]">Duration</p><p className="mt-1 font-semibold">{resource.duration}</p></div><div className="rounded-xl bg-slate-500/6 p-3"><p className="text-[var(--muted)]">Cost</p><p className="mt-1 font-semibold">{resource.cost}</p></div><div className="rounded-xl bg-slate-500/6 p-3"><p className="text-[var(--muted)]">Checked</p><p className="mt-1 font-semibold">15 Sep 2026</p></div></div><p className="mt-4 text-xs leading-5 text-[var(--muted)]"><strong className="text-[var(--foreground)]">Topics:</strong> {resource.topics}</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{resource.why}</p><div className="mt-auto flex gap-2 pt-6"><Button variant="secondary" className="flex-1" onClick={() => setSaved((current) => current.includes(resource.url) ? current.filter((url) => url !== resource.url) : [...current, resource.url])}>{saved.includes(resource.url) ? <Check className="size-4 text-emerald-500" /> : <Bookmark className="size-4" />}{saved.includes(resource.url) ? "Saved" : "Save"}</Button><a href={resource.url} target="_blank" rel="noreferrer" className="flex-1"><Button className="w-full">Open official source <ExternalLink className="size-4" /></Button></a></div><p className="mt-3 text-center text-[11px] text-[var(--muted)]">{resource.verified}</p></article>)}</section>
  </AppShell>;
}
