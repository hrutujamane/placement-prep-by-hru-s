export type SkillState =
  | "Not Started"
  | "Learning"
  | "Practiced"
  | "Assessed"
  | "Project Completed"
  | "Verified";

export type TaskStatus = "pending" | "in_progress" | "paused" | "completed" | "skipped" | "rescheduled";

export type MissionTaskType = "learn" | "practice" | "assess" | "build" | "prove";

export interface Profile {
  name: string;
  email: string;
  college: string;
  branch: string;
  year: string;
  semester: string;
  primaryGoal: string;
  targetDate: string;
  weekdayHours: number;
  saturdayHours: number;
  sundayHours: number;
  learningMethod: string;
  coursePreference: string;
  programmingComfort: string;
  electronicsLevel: string;
  existingSkills: string[];
  targetRoles: string[];
  targetCompanies: string[];
  onboardingComplete: boolean;
}

export interface MissionTask {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  type: MissionTaskType;
  status: TaskStatus;
  skill: string;
  topics: string[];
  priority: number;
  completionCriteria: string;
  expectedOutcome: string;
  scheduledFor: string;
  carryForwardCount: number;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  detail: string;
  startWeek: number;
  endWeek: number;
  dueDate: string;
  status: "active" | "upcoming" | "locked" | "completed";
  progress: number;
  skills: string[];
  completionCriteria: string[];
}

export interface RoadmapPlan {
  id: string;
  request: string;
  goal: string;
  track: string;
  focus: string;
  availableMinutes: number;
  weeklyHours: number;
  difficulty: string;
  durationWeeks: number;
  durationLabel?: string;
  targetDate: string;
  createdAt: string;
  adjusted: boolean;
  adjustmentMessage: string;
  bridgeMessage?: string;
  nextStep: string;
  milestones: RoadmapMilestone[];
  tasks: MissionTask[];
  allocation: Array<{ label: "Learn" | "Practice" | "Build" | "Assess & Prove"; percent: number }>;
}

export type PrepJourneyStatus = "active" | "paused" | "completed" | "archived";

export interface PrepJourney {
  id: string;
  title: string;
  status: PrepJourneyStatus;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  projectIds: string[];
  roadmap: RoadmapPlan;
}

export interface Skill {
  id: string;
  name: string;
  group: string;
  state: SkillState;
  progress: number;
  evidence?: string;
  prerequisite?: string;
}

export interface Project {
  id: string;
  name: string;
  status: "Planning" | "Building" | "Testing" | "Completed";
  description: string;
  technologies: string[];
  components: string[];
  progress: number;
  githubUrl?: string;
  nextMilestone: string;
  templateId?: string;
  templateRevision?: string;
  mode?: "hardware" | "simulation" | "hybrid";
}

export type EquipmentStatus = "working" | "unavailable" | "uncertain";
export type EquipmentCategory = "component" | "tool" | "power" | "software";

export interface EquipmentItem {
  id: string;
  name: string;
  model?: string;
  quantity: number;
  status: EquipmentStatus;
  category: EquipmentCategory;
  notes?: string;
}

export interface BuildPreferences {
  budget?: number;
  currency: string;
  availableMinutes: number;
  currentKnowledge: string;
  targetRole: string;
  difficulty: "starter" | "intermediate" | "advanced";
  mode: "hardware" | "simulation" | "either";
}

export interface ProjectTemplateComponent {
  name: string;
  aliases: string[];
  quantity: number;
  requirement: "required" | "optional";
  category: EquipmentCategory;
  modelNotes?: string;
  powerNotes?: string;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  track: string;
  problemStatement: string;
  careerRelevance: string;
  learningOutcomes: string[];
  prerequisites: string[];
  components: ProjectTemplateComponent[];
  architecture: string[];
  connections: string[];
  voltageAndPower: string[];
  softwareSetup: string[];
  implementationStages: string[];
  expectedResults: string[];
  testingChecklist: string[];
  debuggingDecisionTree: string[];
  limitations: string[];
  upgrades: string[];
  estimatedMinutes: number;
  difficulty: BuildPreferences["difficulty"];
  mode: "hardware" | "simulation";
  source: string;
  revision: string;
  compatibilityNotes: string;
  reviewStatus: "reviewed" | "draft";
  reviewedAt?: string;
}

export type EvidenceStatus = "Not submitted" | "Submitted" | "AI-reviewed" | "Revision requested" | "Mentor-reviewed";
export type EvidenceType = "source_code" | "github" | "circuit_diagram" | "test_observation" | "image" | "demo_video" | "debugging_note" | "limitations" | "contribution";

export interface EvidenceSubmission {
  id: string;
  projectId: string;
  milestoneId?: string;
  skillIds: string[];
  type: EvidenceType;
  title: string;
  content: string;
  url?: string;
  expectedResult?: string;
  actualResult?: string;
  personalContribution?: string;
  debuggingNotes?: string;
  limitations?: string;
  status: EvidenceStatus;
  submittedAt: string;
  reviewMethod: "none" | "ai" | "mentor";
  rubricVersion?: string;
  feedback?: string;
  reviewLimitations?: string;
  simulated: boolean;
  fingerprint: string;
}

export interface PlanAdjustment {
  id: string;
  reason: string;
  requestedMinutes: number;
  createdAt: string;
  status: "applied" | "undone";
  changeSummary: string;
  why: string;
  movedTaskIds: string[];
  deadlineEffect: string;
  beforeTasks: MissionTask[];
  afterTasks: MissionTask[];
  undoneAt?: string;
}

export interface RoleExplorationActivity {
  id: string;
  track: string;
  title: string;
  represents: string;
  prerequisites: string[];
  estimatedMinutes: number;
  requiredTools: string[];
  instructions: string[];
  expectedOutput: string;
  beginnerSupport: string[];
  reflectionQuestions: string[];
}

export interface RoleExplorationAttempt {
  id: string;
  activityId: string;
  track: string;
  completedAt: string;
  enjoyed: "yes" | "unsure" | "no";
  interestingPart: string;
  difficultPart: string;
  wantsAnother: boolean;
  outputNote: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  url?: string;
  jobDescription?: string;
  deadline?: string;
  status: "Interested" | "Applied" | "Assessment" | "Interview" | "Offer" | "Rejected";
  notes?: string;
}

export interface ResumeReviewImprovement {
  priority: "High" | "Medium" | "Low";
  title: string;
  detail: string;
}

export interface ResumeSectionCheck {
  name: string;
  present: boolean;
  detail: string;
}

export interface ResumeDocumentFormat {
  fileType: "pdf" | "docx" | "txt" | "md" | "png" | "jpg" | "jpeg" | "webp";
  pageCount?: number;
  ocrConfidence?: number;
  headingCount: number;
  bulletCount: number;
  linkCount: number;
  tableCount: number;
  notes: string[];
}

export interface ResumeReview {
  id: string;
  createdAt: string;
  company: string;
  role: string;
  jobApplicationId?: string;
  sourceFileName?: string;
  documentFormat?: ResumeDocumentFormat;
  resumeText: string;
  jobDescription: string;
  score: number;
  status: "Needs revision" | "Developing" | "Ready for human review";
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  improvements: ResumeReviewImprovement[];
  polishedLines: string[];
  sectionChecks: ResumeSectionCheck[];
  suggestedSavedFacts: string[];
  analysisSource: "local" | "ai";
}

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface InterviewScorecard {
  clarity: number;
  relevance: number;
  technicalAccuracy: number;
  answerStructure: number;
  communication: number;
  completeness: number;
  uncertaintyHandling: number;
}

export interface InterviewEvaluation {
  scores: InterviewScorecard;
  didWell: string;
  improve: string;
  betterStructure: string;
  uncertaintyFeedback: string;
}

export interface InterviewSessionRecord {
  id: string;
  programDay: number;
  programTitle: string;
  personality: string;
  difficulty: "Beginner" | "Normal" | "Advanced";
  confidenceMode: boolean;
  voiceEnabled: boolean;
  projectId?: string;
  question: string;
  answer: string;
  retryCount: number;
  beforeConfidence: number;
  afterConfidence: number;
  evaluation: InterviewEvaluation;
  evaluationSource: "ai" | "local";
  averageScore: number;
  passed: boolean;
  completedAt: string;
}

export interface InterviewProgramState {
  currentDay: number;
  totalDays: number;
  status: "active" | "completed";
  completedDays: number[];
  repeatCount: number;
  lastAdjustmentMessage: string;
}

export interface DemoState {
  profile: Profile;
  roadmap?: RoadmapPlan;
  prepJourneys: PrepJourney[];
  tasks: MissionTask[];
  skills: Skill[];
  projects: Project[];
  equipment: EquipmentItem[];
  buildPreferences: BuildPreferences;
  evidenceSubmissions: EvidenceSubmission[];
  planAdjustments: PlanAdjustment[];
  roleExplorationAttempts: RoleExplorationAttempt[];
  jobs: JobApplication[];
  resumeReviews: ResumeReview[];
  quizScores: number[];
  confidenceScores: number[];
  interviewProgram: InterviewProgramState;
  interviewSessions: InterviewSessionRecord[];
  weeklyMinutes: number;
  streak: number;
}
