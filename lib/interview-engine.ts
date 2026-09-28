import type { EvidenceSubmission, InterviewEvaluation, InterviewProgramState, InterviewSessionRecord, Profile, Project } from "@/lib/types";

export const interviewProgramDays = [
  { title: "Comfortable conversation", description: "Talk naturally about your branch and interests without pressure.", personality: "Friendly Mentor", difficulty: "Beginner" },
  { title: "Speaking confidence", description: "Give one clear 30–60 second response at a steady pace.", personality: "Friendly Mentor", difficulty: "Beginner" },
  { title: "Self introduction", description: "Build a concise engineering-focused introduction.", personality: "Professional HR", difficulty: "Beginner" },
  { title: "HR basics", description: "Practice motivation, teamwork and learning examples.", personality: "Professional HR", difficulty: "Beginner" },
  { title: "Strengths, weaknesses and goals", description: "Answer honestly with evidence and a growth plan.", personality: "Professional HR", difficulty: "Normal" },
  { title: "Project explanation", description: "Explain a saved project from problem to current evidence.", personality: "Project Reviewer", difficulty: "Normal" },
  { title: "Project cross-questioning", description: "Defend component, protocol and testing choices.", personality: "Project Reviewer", difficulty: "Normal" },
  { title: "Technical basics", description: "Answer foundation questions relevant to your target role.", personality: "Technical Engineer", difficulty: "Normal" },
  { title: "Domain-specific interview", description: "Practice a focused ENTC/ECE role question.", personality: "Technical Engineer", difficulty: "Normal" },
  { title: "Situational questions", description: "Use structured reasoning for engineering situations.", personality: "Professional HR", difficulty: "Normal" },
  { title: "Role preparation", description: "Connect your evidence to role requirements without guessing company processes.", personality: "Technical Engineer", difficulty: "Normal" },
  { title: "Handling unknown questions", description: "Admit uncertainty and reason safely instead of fabricating.", personality: "Friendly Mentor", difficulty: "Normal" },
  { title: "Pressure simulation", description: "Stay structured while follow-ups become more direct.", personality: "Strict Interviewer", difficulty: "Advanced" },
  { title: "Full mock interview", description: "Combine HR, project and technical communication.", personality: "Panel Interview", difficulty: "Advanced" },
  { title: "Final interview assessment", description: "Complete a realistic final review and readiness report.", personality: "Panel Interview", difficulty: "Advanced" },
] as const;

export function createInitialInterviewProgram(): InterviewProgramState {
  return {
    currentDay: 1,
    totalDays: interviewProgramDays.length,
    status: "active",
    completedDays: [],
    repeatCount: 0,
    lastAdjustmentMessage: "Start with a comfortable conversation. There is no aggressive scoring on Day 1.",
  };
}

export function getInterviewQuestion(day: number, profile: Profile, project?: Project, context?: { previousSession?: InterviewSessionRecord; evidence?: EvidenceSubmission[] }) {
  const role = profile.targetRoles[0] ?? "ENTC/ECE engineering";
  const projectName = project?.name ?? "one technical project you have worked on";
  const component = project?.components[0];
  const technology = project?.technologies[0];
  const evidenceTitle = context?.evidence?.find((item) => item.projectId === project?.id)?.title;
  const questions = [
    `What do you enjoy about studying ${profile.branch || "electronics and communication engineering"}?`,
    `In about 60 seconds, describe one ${profile.branch || "ENTC/ECE"} topic you find interesting.`,
    `Please introduce yourself as an engineering student preparing for a ${role} role.`,
    "Tell me about a time you learned a difficult technical concept or worked with someone else to solve a problem.",
    `What is one genuine strength, one skill you are improving, and your current goal of becoming ready for ${role}?`,
    `Tell me about ${projectName}. What problem are you trying to solve, and what evidence have you produced so far${evidenceTitle ? `, including ${evidenceTitle}` : ""}?`,
    component
      ? `In ${projectName}, why did you choose ${component}, what could fail, and how would you test that failure?`
      : `For ${projectName}, explain one design choice, one possible failure, and how you would test it.`,
    `Explain one foundation concept that matters for ${role}, then give a practical example.`,
    domainQuestion(role),
    "A prototype works intermittently one day before a review. How would you isolate the cause, communicate risk, and decide what to demonstrate?",
    `Which evidence from your skills or projects is most relevant to a ${role} role, and what gap are you addressing next?`,
    "Suppose you do not know the exact answer to a technical question. Show how you would respond professionally without guessing.",
    technology
      ? `You used ${technology}, but I am not yet convinced you understand the trade-off. Defend the choice using only what you actually know and tested.`
      : "I am not yet convinced by your design choice. Defend it using only what you actually know and tested.",
    `Give a concise introduction, explain ${projectName}, then connect it to your readiness for ${role}.`,
    `Why are you ready to begin contributing in a ${role} role, what evidence supports that, and what will you continue learning?`,
  ];
  const selected = questions[Math.max(0, Math.min(questions.length - 1, day - 1))];
  if (day <= 3 || !context?.previousSession) return selected;
  return `Last time, one improvement was: ${context.previousSession.evaluation.improve} Today, use that feedback while answering: ${selected}`;
}

export function evaluateInterviewAnswer(answer: string, question: string, project: Project | undefined, retryCount: number): InterviewEvaluation {
  const normalized = answer.toLowerCase();
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const sentences = answer.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 4);
  const structureTerms = countMatches(normalized, ["problem", "approach", "because", "first", "then", "tested", "evidence", "next", "result"]);
  const uncertaintyTerms = countMatches(normalized, ["i don't know", "i do not know", "not sure", "i would verify", "i would check", "assumption", "not tested", "need to test"]);
  const contextTerms = [question, project?.name ?? "", ...(project?.technologies ?? []), ...(project?.components ?? [])]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((term) => term.length >= 4);
  const relevanceHits = new Set(contextTerms.filter((term) => normalized.includes(term))).size;
  const lengthScore = clamp(42 + Math.min(34, words.length * .55));
  const clarity = clamp(lengthScore + Math.min(12, sentences.length * 3) + Math.min(4, retryCount * 2));
  const relevance = clamp(48 + Math.min(34, relevanceHits * 6) + (words.length >= 35 ? 8 : 0));
  const answerStructure = clamp(43 + Math.min(40, structureTerms * 6) + Math.min(8, sentences.length * 2));
  const completeness = clamp((clarity + relevance + answerStructure) / 3 + (words.length >= 60 ? 7 : 0));
  const technicalAccuracy = clamp(50 + Math.min(24, relevanceHits * 4) + (normalized.includes("test") || normalized.includes("verify") ? 8 : 0));
  const communication = clamp((clarity + answerStructure) / 2 + (words.length >= 25 && words.length <= 180 ? 7 : 0));
  const uncertaintyHandling = clamp(55 + Math.min(30, uncertaintyTerms * 10) + (normalized.includes("guess") ? 5 : 0));

  return {
    scores: { clarity, relevance, technicalAccuracy, answerStructure, communication, completeness, uncertaintyHandling },
    didWell: relevance >= 65
      ? "You stayed connected to the question and used details from the information available to you."
      : "You attempted the question directly and created a useful starting point for a stronger response.",
    improve: answerStructure < 65
      ? "Separate the answer into the situation or problem, your reasoning, the action you took, and the evidence you can honestly support."
      : "Add one more concrete piece of evidence and remove any detail that does not support the main point.",
    betterStructure: project
      ? "Problem → design choice → your contribution → test or evidence → limitation → next improvement."
      : "Direct answer → brief reason → concrete example → evidence → next learning step.",
    uncertaintyFeedback: uncertaintyTerms > 0
      ? "You signaled uncertainty constructively. Keep separating known facts, assumptions, and the next verification step."
      : "If part of the answer is unknown, say so briefly, share the related knowledge you do have, and explain how you would verify it.",
  };
}

export function averageInterviewScore(evaluation: InterviewEvaluation) {
  const values = Object.values(evaluation.scores);
  return Math.round(values.reduce((total, score) => total + score, 0) / values.length);
}

export function advanceInterviewProgram(program: InterviewProgramState, session: Omit<InterviewSessionRecord, "id" | "completedAt" | "passed">) {
  const threshold = session.difficulty === "Advanced" ? 70 : session.difficulty === "Normal" ? 64 : 56;
  const passed = session.averageScore >= threshold;
  const completedDays = passed ? Array.from(new Set([...program.completedDays, session.programDay])).sort((a, b) => a - b) : program.completedDays;
  const finalDayPassed = passed && session.programDay === program.totalDays;
  const currentDay = finalDayPassed ? program.totalDays : passed ? Math.min(program.totalDays, session.programDay + 1) : session.programDay;
  return {
    passed,
    program: {
      currentDay,
      totalDays: program.totalDays,
      status: finalDayPassed ? "completed" as const : "active" as const,
      completedDays,
      repeatCount: passed ? 0 : program.repeatCount + 1,
      lastAdjustmentMessage: finalDayPassed
        ? "You completed the confidence journey. Keep practicing targeted sessions before interviews."
        : passed
          ? `Your previous answer met the Day ${session.programDay} checkpoint. Day ${currentDay} is now ready.`
          : `Day ${session.programDay} will repeat with a gentler focus. Your progress is saved, and there is no penalty for retrying.`,
    },
  };
}

function domainQuestion(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("radar")) return "Explain how Doppler shift can be used to estimate target velocity, including one assumption or limitation.";
  if (normalized.includes("rf") || normalized.includes("antenna") || normalized.includes("microwave")) return "Explain why impedance matching matters in an RF signal path and how you would recognize a mismatch.";
  if (normalized.includes("embedded") || normalized.includes("iot")) return "Compare UART, SPI and I2C for an embedded sensor connection, then justify one choice for a specific constraint.";
  if (normalized.includes("vlsi") || normalized.includes("semiconductor")) return "Explain setup time and hold time, and describe what can happen when either requirement is violated.";
  if (normalized.includes("signal")) return "Explain sampling and aliasing, then describe how you would choose a sampling rate for a real signal.";
  return `Explain one core technical concept required for ${role} and connect it to a practical engineering decision.`;
}

function countMatches(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term)).length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
