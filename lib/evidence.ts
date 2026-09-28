import type { EvidenceSubmission, EvidenceType, Project, Skill } from "@/lib/types";

export const evidenceStatusPolicy = {
  "Not submitted": "No evidence record exists yet.",
  Submitted: "A student submission is saved. It is not proof of mastery by itself.",
  "AI-reviewed": "A structured AI review checked the submitted text or links. It is not human certification and does not imply code execution.",
  "Revision requested": "The review found missing or unclear evidence that must be revised.",
  "Mentor-reviewed": "An authorized human mentor reviewed the stated scope. Verification applies only to that scope.",
} as const;

export function buildEvidenceFingerprint(projectId: string, type: EvidenceType, content: string, url?: string) {
  return `${projectId}:${type}:${normalize(url || content).slice(0, 160)}`;
}

export function getEvidenceQuestions(project: Project, evidence: Partial<EvidenceSubmission>) {
  const component = project.components[0];
  const technology = project.technologies[0];
  const questions = [
    `How did you test ${project.name}, and what result did you expect compared with what actually happened?`,
    component
      ? `Why did you use ${component}, and what limitation or failure mode did you observe or plan to test?`
      : "Which implementation choice mattered most, and how did you validate it?",
    technology
      ? `Why was ${technology} appropriate for this documented scope, and what alternative did you consider?`
      : "What technical trade-off did you make, and what evidence supports it?",
    "What failed or behaved unexpectedly, and what debugging step changed your understanding?",
    "Which parts were your personal contribution, and which parts came from a template, library, teammate or tutorial?",
  ];
  if (evidence.type === "github" || evidence.type === "source_code") {
    questions.unshift("Which explicitly selected files contain your main contribution, and what should a reviewer inspect first?");
  }
  return questions;
}

export function evidenceReadinessScore(submissions: EvidenceSubmission[]) {
  const counted = new Map<string, number>();
  for (const submission of submissions) {
    const reviewWeight = submission.status === "Mentor-reviewed" ? 1 : submission.status === "AI-reviewed" ? 0.6 : 0;
    if (reviewWeight === 0) continue;
    const skillKey = submission.skillIds.slice().sort().join(",") || "project";
    const key = `${submission.projectId}:${submission.type}:${skillKey}`;
    counted.set(key, Math.max(counted.get(key) ?? 0, reviewWeight));
  }
  const score = Math.min(100, Math.round([...counted.values()].reduce((sum, value) => sum + value, 0) * 18));
  return {
    score,
    countedRecords: counted.size,
    explanation: "Only one reviewed record per project, evidence type and linked-skill scope contributes. AI-reviewed evidence has lower weight than mentor-reviewed evidence.",
  };
}

export function getSkillVerification(skill: Skill, submissions: EvidenceSubmission[]) {
  const relevant = submissions.filter((submission) => submission.skillIds.includes(skill.id));
  const mentorEvidence = relevant.find((submission) => submission.status === "Mentor-reviewed");
  if (skill.state === "Assessed" && mentorEvidence) {
    return { verified: true, method: "Assessment plus authorized mentor-reviewed evidence", scope: mentorEvidence.title };
  }
  return {
    verified: false,
    method: skill.state === "Assessed" ? "Assessment exists; mentor-reviewed evidence is still required" : "Assessment and mentor-reviewed evidence are required",
    scope: "No verified scope yet",
  };
}

export function generateProjectOutputs(project: Project, submissions: EvidenceSubmission[]) {
  const projectEvidence = submissions.filter((submission) => submission.projectId === project.id);
  const documentedResults = projectEvidence
    .map((submission) => submission.actualResult?.trim())
    .filter((value): value is string => Boolean(value));
  const contributions = projectEvidence
    .map((submission) => submission.personalContribution?.trim())
    .filter((value): value is string => Boolean(value));
  const limitations = projectEvidence
    .map((submission) => submission.limitations?.trim())
    .filter((value): value is string => Boolean(value));
  const stack = project.technologies.join(", ") || "documented project tools";
  const resultText = documentedResults.length > 0
    ? documentedResults.join("; ")
    : "No measurable result has been documented yet; add expected-versus-actual evidence before making quantified claims.";
  const contributionText = contributions.length > 0
    ? contributions.join("; ")
    : "Personal contribution is not documented yet.";

  return {
    readme: `# ${project.name}\n\n## Problem\n${project.description}\n\n## Tools and technologies\n${stack}\n\n## Documented results\n${resultText}\n\n## Personal contribution\n${contributionText}\n\n## Known limitations\n${limitations.join("; ") || "Limitations have not been documented yet."}`,
    resumeBullet: documentedResults.length > 0
      ? `Built ${project.name} using ${stack}; documented testing outcomes including ${documentedResults[0]}.`
      : `Developing ${project.name} using ${stack}, with a focus on documented implementation and testing.`,
    portfolioDescription: `${project.description} The saved workspace documents the tools used, evidence submitted, personal contribution and known limitations without adding unsupported claims.`,
    linkedInDescription: `Project: ${project.name}. Built with ${stack}. ${documentedResults.length > 0 ? `Documented result: ${documentedResults[0]}` : "Testing results are still being documented."}`,
    shortInterviewExplanation: `I worked on ${project.name} to address this problem: ${project.description} I used ${stack}. ${contributionText} ${resultText}`,
    technicalExplanation: `Architecture and implementation details should be read together with the saved evidence. Documented components: ${project.components.join(", ") || "none listed"}. Documented technologies: ${stack}. Known limitations: ${limitations.join("; ") || "not yet documented"}.`,
    interviewQuestions: getEvidenceQuestions(project, projectEvidence[0] ?? {}),
  };
}

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}
