import type { ResumeDocumentFormat, ResumeReview, ResumeReviewImprovement, ResumeSectionCheck } from "@/lib/types";

export interface ResumeReviewInput {
  resumeText: string;
  company: string;
  role: string;
  jobDescription: string;
  jobApplicationId?: string;
  sourceFileName?: string;
  documentFormat?: ResumeDocumentFormat;
  documentedFacts?: string[];
}

export type ResumeReviewResult = Omit<ResumeReview, "id" | "createdAt">;

const phrases = [
  "embedded c", "signal processing", "communication systems", "digital electronics", "network theory",
  "microcontrollers", "microcontroller", "arduino", "esp32", "raspberry pi", "python", "matlab", "simulink",
  "c++", "javascript", "typescript", "verilog", "vhdl", "can", "uart", "spi", "i2c", "mqtt", "rtos",
  "linux", "git", "github", "testing", "debugging", "documentation", "fft", "radar", "rf", "antenna",
  "wireless communication", "telecommunication", "iot", "pcb", "oscilloscope", "logic analyzer", "sensors",
  "data structures", "problem solving", "teamwork", "leadership", "sql", "rest api", "supabase", "next.js",
];

const stopWords = new Set([
  "about", "after", "also", "and", "are", "based", "candidate", "company", "description", "engineering", "experience",
  "for", "from", "have", "intern", "internship", "into", "job", "knowledge", "looking", "must", "our", "preferred",
  "need", "needs", "required", "requirements", "role", "seeking", "should", "skills", "strong", "that", "the", "their", "this", "using",
  "will", "with", "work", "years", "you", "your",
]);

export function analyzeResume(input: ResumeReviewInput): ResumeReviewResult {
  const resumeText = clean(input.resumeText);
  const jobDescription = clean(input.jobDescription);
  const targetText = `${input.role} ${jobDescription}`.trim();
  const keywords = extractKeywords(targetText);
  const resumeNormalized = normalized(resumeText);
  const matchedKeywords = keywords.filter((keyword) => includesKeyword(resumeNormalized, keyword));
  const missingKeywords = keywords.filter((keyword) => !includesKeyword(resumeNormalized, keyword));
  const sectionChecks = getSectionChecks(resumeText);
  const evidenceSignals = getEvidenceSignals(resumeText);
  const keywordScore = keywords.length ? Math.round((matchedKeywords.length / keywords.length) * 45) : 22;
  const sectionScore = Math.round((sectionChecks.filter((section) => section.present).length / sectionChecks.length) * 30);
  const evidenceScore = Math.min(15, evidenceSignals * 3);
  const clarityScore = getClarityScore(resumeText);
  const score = clamp(keywordScore + sectionScore + evidenceScore + clarityScore, 0, 100);
  const status = score < 45 ? "Needs revision" : score < 75 ? "Developing" : "Ready for human review";
  const suggestedSavedFacts = findSuggestedSavedFacts(input.documentedFacts ?? [], resumeText, keywords);

  return {
    company: input.company.trim() || "Target company",
    role: input.role.trim() || "Target role",
    jobApplicationId: input.jobApplicationId,
    sourceFileName: input.sourceFileName,
    documentFormat: input.documentFormat,
    resumeText,
    jobDescription,
    score,
    status,
    matchedKeywords,
    missingKeywords: missingKeywords.slice(0, 12),
    strengths: buildStrengths(sectionChecks, matchedKeywords, evidenceSignals),
    improvements: buildImprovements(sectionChecks, missingKeywords, evidenceSignals, resumeText, suggestedSavedFacts, input.documentFormat),
    polishedLines: buildPolishedLines(resumeText),
    sectionChecks,
    suggestedSavedFacts,
    analysisSource: "local",
  };
}

export function extractKeywords(text: string) {
  const value = normalized(text);
  const found = phrases.filter((phrase) => includesKeyword(value, phrase));
  const wordsInsidePhrases = new Set(found.flatMap((phrase) => phrase.split(/\s+/)));
  const tokens = value.match(/[a-z][a-z0-9+#.-]{2,}/g) ?? [];
  for (const token of tokens) {
    const candidate = token.replace(/[.,]$/, "");
    if (!stopWords.has(candidate) && !wordsInsidePhrases.has(candidate) && !found.includes(candidate) && candidate.length <= 24) found.push(candidate);
  }
  return found.slice(0, 18);
}

function getSectionChecks(text: string): ResumeSectionCheck[] {
  const lower = text.toLowerCase();
  const hasContact = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text) || /(?:\+?91[-\s]?)?[6-9]\d{9}/.test(text);
  return [
    { name: "Contact details", present: hasContact, detail: hasContact ? "An email or phone number is visible." : "Add a professional email and phone number." },
    { name: "Education", present: /\beducation\b|\bcollege\b|\buniversity\b|\bb\.?e\.?\b|\bb\.?tech\b|\bbachelor/.test(lower), detail: /\beducation\b|\bcollege\b|\buniversity\b|\bb\.?e\.?\b|\bb\.?tech\b|\bbachelor/.test(lower) ? "Education information is present." : "Add degree, branch, institution and expected graduation." },
    { name: "Skills", present: /\bskills?\b|\btechnolog(?:y|ies)\b|\btools?\b/.test(lower), detail: /\bskills?\b|\btechnolog(?:y|ies)\b|\btools?\b/.test(lower) ? "A skills or tools section is visible." : "Add a scannable skills section grouped by languages, tools and domain knowledge." },
    { name: "Projects / experience", present: /\bprojects?\b|\bexperience\b|\bintern(?:ship)?\b|\bbuilt\b|\bdeveloped\b|\bimplemented\b|\bdesigned\b/.test(lower), detail: /\bprojects?\b|\bexperience\b|\bintern(?:ship)?\b|\bbuilt\b|\bdeveloped\b|\bimplemented\b|\bdesigned\b/.test(lower) ? "Project or experience evidence is present." : "Add at least one relevant project with your contribution, testing and result." },
    { name: "Links", present: /github\.com|linkedin\.com|https?:\/\//.test(lower), detail: /github\.com|linkedin\.com|https?:\/\//.test(lower) ? "A portfolio, GitHub or LinkedIn link is present." : "Add only working GitHub, portfolio or LinkedIn links." },
    { name: "Role-focused summary", present: /\bsummary\b|\bprofile\b|\bobjective\b/.test(lower), detail: /\bsummary\b|\bprofile\b|\bobjective\b/.test(lower) ? "A summary or objective is visible." : "Add a 2–3 line summary tailored to this role." },
  ];
}

function getEvidenceSignals(text: string) {
  const patterns = [
    /\b(test(?:ed|ing)?|validat(?:ed|ion)|verified|debugg(?:ed|ing))\b/i,
    /\b(result|output|observation|limitation|accuracy|latency|frequency|voltage)\b/i,
    /\b(built|developed|implemented|designed|created|simulated|analyzed|documented)\b/i,
    /\b(github|repository|demo|portfolio)\b/i,
    /\b\d+(?:\.\d+)?\s*(?:%|ms|s|hz|khz|mhz|v|a|hours?|days?|users?)\b/i,
  ];
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function getClarityScore(text: string) {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  const longLines = text.split(/\r?\n/).filter((line) => line.trim().split(/\s+/).length > 35).length;
  let score = words.length >= 80 ? 6 : words.length >= 35 ? 4 : 2;
  if (words.length >= 180) score += 2;
  if (/^[•*-]|\n[•*-]/m.test(text)) score += 2;
  return clamp(score - Math.min(3, longLines), 0, 10);
}

function buildStrengths(sections: ResumeSectionCheck[], matched: string[], evidenceSignals: number) {
  const strengths: string[] = [];
  if (matched.length) strengths.push(`Shows role-relevant terms such as ${matched.slice(0, 4).join(", ")}.`);
  if (sections.find((section) => section.name === "Projects / experience")?.present) strengths.push("Includes practical project or experience content.");
  if (evidenceSignals >= 3) strengths.push("Uses implementation or testing language that supports credibility.");
  if (sections.find((section) => section.name === "Links")?.present) strengths.push("Provides a link that a reviewer can inspect.");
  if (!strengths.length) strengths.push("Provides a starting draft that can be organized around verified education, skills and project work.");
  return strengths.slice(0, 4);
}

function buildImprovements(sections: ResumeSectionCheck[], missing: string[], evidenceSignals: number, text: string, savedFacts: string[], format?: ResumeDocumentFormat): ResumeReviewImprovement[] {
  const improvements: ResumeReviewImprovement[] = [];
  const absentCore = sections.filter((section) => !section.present).slice(0, 2);
  for (const section of absentCore) improvements.push({ priority: "High", title: `Strengthen ${section.name.toLowerCase()}`, detail: section.detail });
  if (missing.length) improvements.push({ priority: "High", title: "Close the role-language gap", detail: `If genuinely supported by your work, demonstrate ${missing.slice(0, 5).join(", ")}. Do not add keywords you cannot explain in an interview.` });
  if (format?.pageCount && format.pageCount > 2) improvements.push({ priority: "Medium", title: "Review resume length", detail: `${format.pageCount} PDF pages were detected. For an early-career resume, confirm every page contains role-relevant evidence and remove repetition.` });
  if (format?.ocrConfidence !== undefined && format.ocrConfidence < 65) improvements.push({ priority: "High", title: "Retake the resume image", detail: `Text recognition confidence was ${format.ocrConfidence}%. Use a sharper, straight and well-lit image before relying on keyword or wording feedback.` });
  if (format && format.headingCount === 0) improvements.push({ priority: "Medium", title: "Make section hierarchy clearer", detail: "No clear heading structure was detected in the uploaded document. Use consistent headings such as Education, Skills, Projects and Experience." });
  if (format && format.bulletCount === 0) improvements.push({ priority: "Medium", title: "Use scannable project bullets", detail: "No list bullets were detected. Break dense project or experience paragraphs into concise, evidence-based bullets." });
  if (format && format.tableCount > 0) improvements.push({ priority: "Low", title: "Check table-based layout", detail: "A table was detected in the DOCX. Confirm that reading order remains clear when copied into a plain-text application form." });
  if (evidenceSignals < 3) improvements.push({ priority: "Medium", title: "Show implementation and testing evidence", detail: "For each relevant project, state what you personally built, how you tested it, the observed result and one limitation." });
  if (!/\b\d+(?:\.\d+)?\s*(?:%|ms|s|hz|khz|mhz|v|a|hours?|days?|users?)\b/i.test(text)) improvements.push({ priority: "Medium", title: "Add measured results only when documented", detail: "Use a real test value, scope or count if you recorded one. Leave it unquantified when no measurement exists." });
  if (savedFacts.length) improvements.push({ priority: "Low", title: "Consider saved project facts", detail: `Your workspace contains relevant documented facts: ${savedFacts.slice(0, 2).join("; ")}. Include them only after confirming they are accurate and yours.` });
  return improvements.slice(0, 6);
}

function buildPolishedLines(text: string) {
  const lines = text
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[•*-]\s*/, "").trim())
    .filter((line) => line.length >= 24 && line.length <= 280);
  const actionLines = lines.filter((line) => /\b(built|developed|implemented|designed|created|simulated|analyzed|tested|documented|planning|working)\b/i.test(line));
  const selected = (actionLines.length ? actionLines : lines).slice(0, 3);
  return selected.map((line) => {
    const cleaned = line.replace(/\s+/g, " ").replace(/[.;]+$/, "");
    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
  });
}

function findSuggestedSavedFacts(facts: string[], resumeText: string, keywords: string[]) {
  const resume = normalized(resumeText);
  return facts
    .map(clean)
    .filter((fact) => fact.length >= 12)
    .filter((fact) => !resume.includes(normalized(fact)))
    .filter((fact) => keywords.length === 0 || keywords.some((keyword) => includesKeyword(normalized(fact), keyword)))
    .slice(0, 4);
}

function includesKeyword(text: string, keyword: string) {
  const variants: Record<string, string> = {
    testing: "test(?:ed|ing)?",
    debugging: "debug(?:ged|ging)?",
    documentation: "document(?:ed|ation|ing)?",
    sensors: "sensors?",
    microcontrollers: "microcontrollers?",
  };
  if (variants[keyword]) return new RegExp(`(?:^|[^a-z0-9])${variants[keyword]}(?:$|[^a-z0-9])`, "i").test(text);
  const escaped = normalized(keyword).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function clean(value: string) {
  return value.replace(/\0/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
