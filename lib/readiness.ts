import type { DemoState } from "@/lib/types";
import { evidenceReadinessScore } from "@/lib/evidence";

export function calculatePlacementReadiness(state: DemoState) {
  const fundamentals = average(state.skills.filter((skill) => skill.group === "Foundation").map((skill) => skill.progress));
  const roleSkills = average(state.skills.filter((skill) => skill.group === "RF" || skill.group === "Core").map((skill) => skill.progress));
  const evidence = evidenceReadinessScore(state.evidenceSubmissions);
  const projectExecution = average(state.projects.map((project) => project.progress));
  const projects = Math.round(projectExecution * .45 + evidence.score * .55);
  const assessments = average(state.quizScores);
  const consistency = Math.min(100, state.streak * 7 + Math.round(state.weeklyMinutes / 12));
  const portfolio = evidence.countedRecords > 0 ? Math.min(80, 35 + evidence.countedRecords * 12) : 25;
  const interview = calculateInterviewReadiness(state);
  const resume = 58;
  const categories = { fundamentals, roleSkills, projects, evidence: evidence.score, portfolio, resume, assessments, interview, consistency };
  const score = Math.round(fundamentals * .18 + roleSkills * .2 + projects * .16 + portfolio * .1 + resume * .1 + assessments * .1 + interview * .1 + consistency * .06);
  return { score, categories };
}

export function calculateInterviewReadiness(state: DemoState) {
  const confidence = state.confidenceScores.length ? state.confidenceScores.at(-1)! * 10 : 30;
  const projectEvidence = evidenceReadinessScore(state.evidenceSubmissions).score;
  const technical = average(state.quizScores);
  const interviewEvidence = average(state.interviewSessions.slice(-5).map((session) => session.averageScore));
  return Math.round(confidence * .25 + projectEvidence * .2 + technical * .25 + interviewEvidence * .25 + Math.min(100, state.streak * 6) * .05);
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
}
