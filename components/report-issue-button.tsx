"use client";

import { FormEvent, useState } from "react";
import { Flag, Send, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { reportCategories } from "@/lib/student-reports";
import { Badge, Button, Select, Textarea } from "@/components/ui";

export function ReportIssueButton({ pagePath }: { pagePath: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof reportCategories)[number]>("Bug");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase!.auth.getSession();
      if (!data.session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/student-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ category, message, pagePath }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Your report could not be sent.");
      setSent(true); setMessage("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your report could not be sent."); }
    finally { setLoading(false); }
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setSent(false); setError(""); }} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-[var(--muted)] transition hover:bg-amber-500/10 hover:text-[var(--foreground)]" aria-label="Report a problem"><Flag className="size-4 text-[var(--brand)]" />Report a problem</button>
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"><button type="button" className="absolute inset-0" aria-label="Close report form" onClick={() => setOpen(false)} /><form onSubmit={submit} className="relative w-full max-w-lg rounded-[1.5rem] border border-[var(--line)] bg-[var(--background)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><Badge tone="warning"><Flag className="mr-1 size-3.5" />Student support</Badge><h2 className="mt-3 text-xl font-bold">Report a problem</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Tell the admin what happened. Your report includes this page: {pagePath}</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-[var(--muted)] hover:bg-slate-500/10" aria-label="Close report form"><X className="size-5" /></button></div>{sent ? <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 text-sm text-emerald-700 dark:text-emerald-300">Your report has been sent. The admin can now review it.</div> : <div className="mt-6 space-y-4"><label className="block text-sm font-medium">Problem type<Select className="mt-1.5" value={category} onChange={(event) => setCategory(event.target.value as (typeof reportCategories)[number])}>{reportCategories.map((item) => <option key={item}>{item}</option>)}</Select></label><label className="block text-sm font-medium">What happened?<Textarea className="mt-1.5" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Example: I completed a roadmap task but the progress did not update." minLength={10} maxLength={2000} required /></label>{error && <p role="alert" className="text-sm text-rose-500">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={loading}><Send className="size-4" />Send report</Button></div></div>}</form></div>}
  </>;
}
