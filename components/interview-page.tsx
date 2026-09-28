"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, ChevronRight, HeartHandshake, Lightbulb, MessageSquareText, RefreshCcw, Send, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { LiveInterviewPanel } from "@/components/live-interview-panel";
import { averageInterviewScore, evaluateInterviewAnswer, getInterviewQuestion, interviewProgramDays } from "@/lib/interview-engine";
import { interviewEvaluationSchema } from "@/lib/interview-schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { InterviewEvaluation, InterviewSessionRecord } from "@/lib/types";
import { Badge, Button, Label, PageHeader, Progress, Select, Textarea } from "@/components/ui";

const personalities = ["Friendly Mentor", "Professional HR", "Technical Engineer", "Project Reviewer", "Strict Interviewer", "Panel Interview"];
const difficulties: InterviewSessionRecord["difficulty"][] = ["Beginner", "Normal", "Advanced"];

export function InterviewPage() {
  const { state, completeInterviewSession, mockMode, persistenceError, persistenceStatus } = useApp();
  const program = state.interviewProgram;
  const currentDay = Math.max(1, Math.min(interviewProgramDays.length, program.currentDay));
  const dayDefinition = interviewProgramDays[currentDay - 1];
  const evidenceProjectId = state.evidenceSubmissions.find((item) => item.status !== "Not submitted")?.projectId;
  const defaultProjectId = evidenceProjectId ?? state.projects.find((item) => item.status !== "Completed")?.id ?? state.projects[0]?.id ?? "";
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const project = state.projects.find((item) => item.id === selectedProjectId) ?? state.projects[0];
  const previousProjectSession = [...state.interviewSessions].reverse().find((item) => !project || item.projectId === project.id) ?? state.interviewSessions.at(-1);
  const question = useMemo(() => getInterviewQuestion(currentDay, state.profile, project, { previousSession: previousProjectSession, evidence: state.evidenceSubmissions }), [currentDay, previousProjectSession, project, state.evidenceSubmissions, state.profile]);
  const [personality, setPersonality] = useState<string>(dayDefinition.personality);
  const [difficulty, setDifficulty] = useState<InterviewSessionRecord["difficulty"]>(dayDefinition.difficulty);
  const [confidenceMode, setConfidenceMode] = useState(true);
  const [session, setSession] = useState(false);
  const [beforeConfidence, setBeforeConfidence] = useState(5);
  const [afterConfidence, setAfterConfidence] = useState(6);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [evaluationSource, setEvaluationSource] = useState<"ai" | "local">("local");
  const [evaluationNotice, setEvaluationNotice] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState({ student: "", interviewer: "" });
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const completedCount = program.completedDays.length;
  const latestSessions = state.interviewSessions.slice(-3).reverse();
  const recordedQuestion = voiceUsed && voiceTranscript.interviewer.trim()
    ? `${question}\n\nAdaptive voice interviewer transcript:\n${voiceTranscript.interviewer}`.slice(0, 12_000)
    : question;
  const voiceContext = useMemo(() => ({
    programDay: currentDay,
    programTitle: dayDefinition.title,
    personality,
    difficulty,
    confidenceMode,
    openingQuestion: question,
    previousFeedback: previousProjectSession?.evaluation.improve,
    profile: {
      name: state.profile.name,
      branch: state.profile.branch,
      targetRoles: state.profile.targetRoles,
      existingSkills: state.profile.existingSkills,
    },
    project: project ? {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      technologies: project.technologies,
      components: project.components,
    } : undefined,
    evidence: state.evidenceSubmissions
      .filter((item) => !project || item.projectId === project.id)
      .slice(-10)
      .map((item) => ({
        title: item.title,
        type: item.type,
        status: item.status,
        actualResult: item.actualResult,
        limitations: item.limitations,
        personalContribution: item.personalContribution,
      })),
  }), [confidenceMode, currentDay, dayDefinition.title, difficulty, personality, previousProjectSession?.evaluation.improve, project, question, state.evidenceSubmissions, state.profile.branch, state.profile.existingSkills, state.profile.name, state.profile.targetRoles]);

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (answer.trim().length < 20 || evaluating) return;
    setEvaluating(true);
    setEvaluationNotice("");
    const localEvaluation = evaluateInterviewAnswer(answer, recordedQuestion, project, retryCount);
    let nextEvaluation = localEvaluation;
    let nextSource: "ai" | "local" = "local";
    if (!mockMode) {
      try {
        const token = await getAccessToken();
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            type: "interview_feedback",
            prompt: `Interview questions:\n${recordedQuestion}\n\nStudent transcript or answer:\n${answer}`,
            profile: { branch: state.profile.branch, targetRoles: state.profile.targetRoles },
            context: {
              programDay: currentDay,
              programTitle: dayDefinition.title,
              difficulty,
              retryCount,
              voiceInterview: voiceUsed,
              project: project ? { name: project.name, technologies: project.technologies, components: project.components } : null,
            },
          }),
        });
        if (!response.ok) throw new Error("AI evaluation is temporarily unavailable.");
        nextEvaluation = interviewEvaluationSchema.parse(await response.json());
        nextSource = "ai";
      } catch {
        setEvaluationNotice("AI evaluation was unavailable, so a transparent local rubric was used. You can retry before saving.");
      }
    } else {
      setEvaluationNotice("Demo evaluation uses a transparent local rubric. Configure OpenAI for contextual AI feedback.");
    }
    setEvaluation(nextEvaluation);
    setEvaluationSource(nextSource);
    setEvaluating(false);
  }

  function startSession(useConfidenceMode: boolean) {
    setConfidenceMode(useConfidenceMode);
    if (useConfidenceMode) {
      setPersonality("Friendly Mentor");
      setDifficulty("Beginner");
    }
    setSession(true);
    setEnded(false);
    setEvaluation(null);
    setEvaluationNotice("");
    setAnswer("");
    setRetryCount(0);
    setShowHint(false);
    setSaveError("");
    setVoiceUsed(false);
    setVoiceActive(false);
    setVoiceTranscript({ student: "", interviewer: "" });
  }

  function finishSession() {
    if (!evaluation) return;
    setEnded(true);
    setSession(false);
  }

  async function saveSession() {
    if (!evaluation || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await completeInterviewSession({
        programDay: currentDay,
        programTitle: dayDefinition.title,
        personality,
        difficulty,
        confidenceMode,
        voiceEnabled: voiceUsed,
        projectId: project?.id,
        question: recordedQuestion,
        answer: answer.trim(),
        retryCount,
        beforeConfidence,
        afterConfidence,
        evaluation,
        evaluationSource,
        averageScore: averageInterviewScore(evaluation),
      });
      setEnded(false);
      setEvaluation(null);
      setAnswer("");
      setRetryCount(0);
      setVoiceUsed(false);
      setVoiceActive(false);
      setVoiceTranscript({ student: "", interviewer: "" });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The session could not be saved. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return <AppShell>
    <PageHeader
      eyebrow="Interview Prep"
      title="Build confidence before pressure."
      description="A gradual, adaptive journey for students who feel shy, nervous or inexperienced—then realistic practice when you are ready."
      action={<button onClick={() => setBeforeConfidence((current) => current === 10 ? 1 : current + 1)} aria-label="Set confidence before session"><Badge tone="brand"><Sparkles className="mr-1 size-3.5" />Confidence before: {beforeConfidence}/10</Badge></button>}
    />

    {!session && !ended && <>
      <section className="mb-6 overflow-hidden rounded-[1.6rem] border border-violet-500/20 bg-gradient-to-br from-violet-500/14 via-[var(--card)] to-emerald-500/8 p-6 sm:p-8">
        <div className="grid items-center gap-7 lg:grid-cols-[1fr_.72fr]">
          <div>
            <Badge tone="brand"><HeartHandshake className="mr-1.5 size-3.5" />Confidence Mode</Badge>
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">I&apos;m nervous about interviews</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">Start with a relaxed conversation. Early sessions prioritize speaking comfort, honest answers and safe retries—not aggressive scoring.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => startSession(true)}><MessageSquareText className="size-4" />Start a gentle session</Button>
              <Button size="lg" variant="secondary" onClick={() => startSession(false)}>Start today&apos;s checkpoint</Button>
            </div>
          </div>
          <div className="card bg-[var(--card)]/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--brand-strong)]">Today · Day {currentDay}</p>
            <h3 className="mt-2 font-bold">{dayDefinition.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{dayDefinition.description}</p>
            <Progress value={Math.round(completedCount / program.totalDays * 100)} className="mt-5" />
            <p className="mt-3 text-xs text-[var(--muted)]">{program.lastAdjustmentMessage}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="font-bold">Configure a session</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Choose the environment you want to practice.</p>
            <div className="mt-5"><Label>Project context</Label><Select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}><option value="">No saved project</option>{state.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><p className="mt-2 text-xs text-[var(--muted)]">Questions use only the selected project&apos;s saved components, technologies and evidence.</p></div>
            {previousProjectSession && <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/7 p-3 text-xs leading-5 text-[var(--muted)]"><strong className="text-[var(--foreground)]">Continue from last time:</strong> {previousProjectSession.evaluation.improve}</div>}
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Interviewer</p>
              <div className="grid gap-2 sm:grid-cols-2">{personalities.map((item) => <button key={item} onClick={() => setPersonality(item)} className={`rounded-xl border px-3 py-3 text-left text-sm font-medium ${personality === item ? "border-[var(--brand)] bg-violet-500/8 text-[var(--brand-strong)]" : "border-[var(--line)]"}`}>{item}</button>)}</div>
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Difficulty</p>
              <div className="flex gap-2">{difficulties.map((item) => <button key={item} onClick={() => setDifficulty(item)} className={`flex-1 rounded-xl border px-2 py-2 text-sm font-semibold ${difficulty === item ? "border-[var(--brand)] bg-violet-500/8 text-[var(--brand-strong)]" : "border-[var(--line)]"}`}>{item}</button>)}</div>
            </div>
            <Button className="mt-7 w-full" onClick={() => startSession(false)}>Start {personality} session <ArrowRight className="size-4" /></Button>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Confidence trend</h2><p className="mt-1 text-xs text-[var(--muted)]">Self-reported after each saved session.</p></div><TrendingUp className="size-5 text-emerald-500" /></div>
            <div className="mt-5 flex h-28 items-end gap-2">{state.confidenceScores.slice(-10).map((score, index) => <div key={`${score}-${index}`} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-emerald-400" style={{ height: `${Math.max(10, score * 10)}%` }} /><span className="text-[10px] font-bold text-[var(--muted)]">{score}</span></div>)}</div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">15-day confidence journey</h2><p className="mt-1 text-sm text-[var(--muted)]">A low score repeats the stage gently; progress is never shamed.</p></div><Badge tone={program.status === "completed" ? "success" : "brand"}>{completedCount} days complete</Badge></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{interviewProgramDays.map((day, index) => {
            const dayNumber = index + 1;
            const completed = program.completedDays.includes(dayNumber);
            const active = dayNumber === currentDay;
            return <div key={day.title} className={`flex items-center gap-3 rounded-xl border p-3 ${active ? "border-violet-500/35 bg-violet-500/6" : "border-[var(--line)]"}`}><div className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${completed ? "bg-emerald-500 text-white" : active ? "bg-[var(--brand)] text-white" : "bg-slate-500/10 text-[var(--muted)]"}`}>{completed ? <Check className="size-4" /> : dayNumber}</div><div><p className="text-sm font-medium">{day.title}</p>{active && <p className="mt-0.5 text-[11px] text-[var(--brand-strong)]">Current adaptive checkpoint</p>}</div></div>;
          })}</div>
          {latestSessions.length > 0 && <div className="mt-6 border-t border-[var(--line)] pt-5"><h3 className="text-sm font-bold">Recent saved sessions</h3><div className="mt-3 space-y-2">{latestSessions.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-500/5 px-3 py-2 text-xs"><span>Day {item.programDay} · {item.programTitle}</span><Badge tone={item.passed ? "success" : "warning"}>{item.averageScore} · {item.passed ? "Advanced" : "Repeat"}</Badge></div>)}</div></div>}
        </div>
      </section>
    </>}

    {session && <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <LiveInterviewPanel
        context={voiceContext}
        onTranscriptChange={(transcript) => {
          setVoiceTranscript(transcript);
          if (transcript.student.trim()) setAnswer(transcript.student);
        }}
        onVoiceUsed={() => setVoiceUsed(true)}
        onActiveChange={setVoiceActive}
        onExit={() => { setSession(false); setVoiceActive(false); }}
      />

      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-center justify-between"><Badge tone="brand">{voiceUsed ? "Adaptive voice interview" : "Focused text practice"}</Badge><span className="text-xs text-[var(--muted)]">Day {currentDay} of {program.totalDays}</span></div>
          <Progress value={Math.round(currentDay / program.totalDays * 100)} className="mt-3" />
          <div className="mt-5 flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-[var(--brand)]"><Bot className="size-4" /></div><div><p className="text-sm font-semibold">Opening question:</p><p className="mt-2 text-lg font-medium leading-7">{question}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">In voice mode, Maya listens to each answer and chooses one grounded follow-up at a time, progressing from foundations to advanced scenarios.</p></div></div>
        </div>
        <form onSubmit={submitAnswer} className="card p-5">
          <div className="mb-3 flex items-center justify-between"><label className="text-sm font-bold">Your response</label><span className="text-xs text-[var(--muted)]">{voiceUsed ? "Voice transcript · editable" : "Text mode"} · Retry {retryCount}</span></div>
          <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain naturally. It does not need to be perfect…" className="min-h-36" />
          {showHint && <div className="mt-3 rounded-xl bg-amber-500/8 px-4 py-3 text-xs leading-5 text-[var(--muted)]"><strong className="text-[var(--ink)]">Structure hint:</strong> Direct answer → reason → concrete example or evidence → limitation or next step.</div>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setShowHint((current) => !current)}><Lightbulb className="size-4" />{showHint ? "Hide structure hint" : "Give me a structure hint"}</Button><Button disabled={answer.trim().length < 20 || evaluating || voiceActive}>{voiceActive ? "End voice to evaluate" : evaluating ? "Evaluating…" : "Evaluate answer"} <Send className="size-4" /></Button></div>
        </form>
        {evaluation && <div className="card p-5">
          <div className="flex items-center justify-between"><h3 className="font-bold">Answer feedback</h3><Badge tone={evaluationSource === "ai" ? "brand" : "success"}>{evaluationSource === "ai" ? "AI-generated feedback" : "Local rubric"}</Badge></div>
          {evaluationNotice && <p className="mt-3 rounded-xl bg-amber-500/8 px-3 py-2 text-xs text-[var(--muted)]">{evaluationNotice}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Feedback title="What you did well" text={evaluation.didWell} positive /><Feedback title="What to improve" text={evaluation.improve} /><Feedback title="Better answer structure" text={evaluation.betterStructure} positive /><Feedback title="Handling uncertainty" text={evaluation.uncertaintyFeedback} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniScore label="Clarity" value={evaluation.scores.clarity} /><MiniScore label="Relevance" value={evaluation.scores.relevance} /><MiniScore label="Technical" value={evaluation.scores.technicalAccuracy} /><MiniScore label="Structure" value={evaluation.scores.answerStructure} /></div>
          <div className="mt-4 flex gap-3"><Button variant="secondary" onClick={() => { setEvaluation(null); setAnswer(""); setRetryCount((current) => current + 1); }}><RefreshCcw className="size-4" />Try again</Button><Button onClick={finishSession}>Complete session <ChevronRight className="size-4" /></Button></div>
        </div>}
      </div>
    </section>}

    {ended && evaluation && <section className="mx-auto max-w-4xl card p-6 sm:p-9">
      <div className="text-center"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-500"><ShieldCheck className="size-8" /></div><h2 className="mt-5 text-3xl font-bold">Practice complete</h2><p className="mt-2 text-[var(--muted)]">Save the session to update your adaptive 15-day journey.</p></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><Score label="Clarity" value={evaluation.scores.clarity} /><Score label="Answer structure" value={evaluation.scores.answerStructure} /><Score label="Handling uncertainty" value={evaluation.scores.uncertaintyHandling} /></div>
      <div className="mt-8 rounded-2xl border border-[var(--line)] p-5"><h3 className="font-bold">How confident do you feel now?</h3><p className="mt-1 text-sm text-[var(--muted)]">Self-reported confidence only—no facial-expression claims.</p><div className="mt-5 flex flex-wrap gap-2">{[1,2,3,4,5,6,7,8,9,10].map((score) => <button key={score} onClick={() => setAfterConfidence(score)} className={`grid size-9 place-items-center rounded-lg border text-sm font-semibold ${afterConfidence === score ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)]"}`}>{score}</button>)}</div></div>
      {(saveError || persistenceStatus === "error") && <div className="mt-5 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3 text-sm text-rose-500">{saveError || persistenceError}</div>}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center"><Button variant="secondary" onClick={() => { setEnded(false); setSession(true); }}><RefreshCcw className="size-4" />Return to answer</Button><Button onClick={() => void saveSession()} disabled={saving}>{saving ? "Saving session…" : "Save confidence & update journey"} <Check className="size-4" /></Button></div>
    </section>}
  </AppShell>;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function Feedback({ title, text, positive }: { title: string; text: string; positive?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${positive ? "border-emerald-500/20 bg-emerald-500/6" : "border-amber-500/20 bg-amber-500/6"}`}><p className="text-xs font-bold uppercase tracking-[.1em]">{title}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{text}</p></div>;
}

function Score({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><Progress value={value} className="mt-3" /></div>;
}

function MiniScore({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-500/6 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}
