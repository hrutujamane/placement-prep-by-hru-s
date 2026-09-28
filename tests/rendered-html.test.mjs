import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function renderedHtml(pathname = "/") {
  const outputName = pathname === "/" ? "index" : pathname.slice(1);
  return readFile(new URL(`../.next/server/app/${outputName}.html`, import.meta.url), "utf8");
}

test("sends the front page to login first", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /redirect\(["']\/login["']\)/i);
  assert.doesNotMatch(source, /LandingPage/);
});

test("renders every public authentication route", async () => {
  for (const pathname of ["/login", "/signup", "/forgot-password"]) {
    const html = await renderedHtml(pathname);
    assert.match(html, /PLACEMENT PREP/i, pathname);
  }
});

test("renders protected product route shells", async () => {
  for (const pathname of ["/dashboard", "/journey", "/career-discovery", "/roadmap", "/prep-history", "/projects", "/resources", "/quiz", "/interview", "/resume", "/jobs", "/onboarding"]) {
    const html = await renderedHtml(pathname);
    assert.match(html, /PLACEMENT PREP/i, pathname);
  }
});

test("keeps preparation journeys and opens a dedicated history dashboard", async () => {
  const historySource = await readFile(new URL("../components/prep-history-page.tsx", import.meta.url), "utf8");
  const detailSource = await readFile(new URL("../components/prep-journey-dashboard.tsx", import.meta.url), "utf8");
  const providerSource = await readFile(new URL("../components/app-provider.tsx", import.meta.url), "utf8");
  assert.match(historySource, /Prep History/i);
  assert.match(historySource, /Open dashboard/i);
  assert.match(detailSource, /Next-up queue/i);
  assert.match(detailSource, /Learning references/i);
  assert.match(detailSource, /History is non-destructive/i);
  assert.match(providerSource, /upsertPrimaryJourney/i);
  assert.match(providerSource, /syncJourneyTasks/i);
});

test("renders the generated roadmap chart and task budget controls", async () => {
  const html = await renderedHtml("/roadmap");
  const source = await readFile(new URL("../components/roadmap-page.tsx", import.meta.url), "utf8");
  assert.match(html, /Career Roadmap \| PLACEMENT PREP/i);
  assert.match(source, /Personalized roadmap chart/i);
  assert.match(source, /Today(?:&apos;|')s budget/i);
  assert.match(source, /Generate new roadmap/i);
  assert.match(source, /Within budget/i);
});

test("shows a detailed student prompt before generating a roadmap", async () => {
  const source = await readFile(new URL("../components/dashboard-page.tsx", import.meta.url), "utf8");
  assert.match(source, /Describe your career goal/i);
  assert.match(source, /Target.*Starting point.*Constraints/is);
  assert.match(source, /Build my roadmap/i);
  assert.match(source, /router\.push\(["']\/roadmap["']\)/i);
});

test("keeps dashboard insights relevant and evidence-aware", async () => {
  const source = await readFile(new URL("../components/dashboard-page.tsx", import.meta.url), "utf8");
  assert.match(source, /Progress insights/i);
  assert.match(source, /Priority focus/i);
  assert.match(source, /Verified strength/i);
  assert.match(source, /No project linked to/i);
  assert.match(source, /findRelevantProjects/i);
  assert.doesNotMatch(source, />Weak skill</i);
  assert.doesNotMatch(source, />Strong skill</i);
});

test("connects the engineering journey, inventory, evidence and career trials", async () => {
  const journey = await readFile(new URL("../components/engineering-journey-page.tsx", import.meta.url), "utf8");
  const projects = await readFile(new URL("../components/projects-page.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/project-workspace.tsx", import.meta.url), "utf8");
  const careers = await readFile(new URL("../components/career-discovery-page.tsx", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../components/dashboard-page.tsx", import.meta.url), "utf8");
  assert.match(journey, /My Engineering Journey/i);
  assert.match(journey, /What still needs practice/i);
  assert.match(projects, /EquipmentInventory/i);
  assert.match(workspace, /Prove it/i);
  assert.match(workspace, /evidenceStatusPolicy/i);
  assert.match(careers, /Try this career/i);
  assert.match(dashboard, /AdaptivePlanDialog/i);
});

test("adds milestone-specific learning references to the roadmap", async () => {
  const source = await readFile(new URL("../components/roadmap-page.tsx", import.meta.url), "utf8");
  const resources = await readFile(new URL("../lib/learning-resources.ts", import.meta.url), "utf8");
  assert.match(source, /What to complete and where to learn/i);
  assert.match(source, /Learn from/i);
  assert.match(source, /getLearningResourcesForMilestone/i);
  assert.match(resources, /NPTEL/);
  assert.match(resources, /YouTube/);
  assert.match(resources, /Udemy/);
  assert.match(resources, /Paid · price varies/);
  assert.match(resources, /recent reviews before buying/i);
});

test("ships the complete Supabase schema with RLS", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609150001_initial_schema.sql", import.meta.url), "utf8");
  const requiredTables = [
    "profiles", "career_goals", "career_tracks", "skills", "skill_dependencies", "user_skills",
    "roadmaps", "roadmap_milestones", "tasks", "task_history", "resources", "saved_resources",
    "projects", "project_milestones", "quizzes", "quiz_questions", "quiz_attempts", "study_sessions",
    "interview_programs", "interview_sessions", "interview_questions", "interview_answers",
    "interview_feedback", "confidence_logs", "achievements", "job_applications", "resume_versions",
    "ai_conversations", "placement_readiness_history", "interview_readiness_history",
  ];
  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`, "i"), table);
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"), table);
  }
  assert.match(sql, /auth\.uid\(\) = user_id/i);
  assert.match(sql, /auth\.uid\(\) = id/i);
});

test("ships atomic roadmap and task-history persistence functions", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609150002_goal_roadmap_workflow.sql", import.meta.url), "utf8");
  assert.match(sql, /function public\.save_generated_roadmap\(payload jsonb\)/i);
  assert.match(sql, /planned task time exceeds available time/i);
  assert.match(sql, /function public\.update_mission_task_status/i);
  assert.match(sql, /insert into public\.task_history/i);
  assert.match(sql, /auth\.uid\(\)/i);
});

test("ships adaptive interview persistence and validated session UI", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202609150003_interview_progress.sql", import.meta.url), "utf8");
  const source = await readFile(new URL("../components/interview-page.tsx", import.meta.url), "utf8");
  assert.match(sql, /function public\.save_interview_session\(payload jsonb\)/i);
  assert.match(sql, /insert into public\.interview_answers/i);
  assert.match(sql, /insert into public\.interview_feedback/i);
  assert.match(sql, /insert into public\.confidence_logs/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(source, /15-day confidence journey/i);
  assert.match(source, /Current adaptive checkpoint/i);
  assert.match(source, /Save confidence & update journey/i);
  assert.match(source, /AI-generated feedback/i);
});

test("seeds every initial ENTC and ECE career track", async () => {
  const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  const requiredTracks = [
    "Embedded Systems", "IoT", "RF Engineering", "Radar Engineering", "Antenna Engineering",
    "Microwave Engineering", "VLSI", "Semiconductor Engineering", "Signal Processing",
    "Telecommunication", "Wireless Communication", "Networking", "Industrial Automation", "PLC",
    "Robotics", "Core Electronics", "Software / IT", "AI + Electronics",
  ];
  for (const track of requiredTracks) {
    assert.match(seed, new RegExp(`'${track.replace(/[+]/g, "\\+")}'`), track);
  }
});

test("keeps server credentials private and documents demo mode", async () => {
  const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const aiRoute = await readFile(new URL("../app/api/ai/route.ts", import.meta.url), "utf8");
  const realtimeRoute = await readFile(new URL("../app/api/realtime/session/route.ts", import.meta.url), "utf8");
  assert.match(env, /^OPENAI_API_KEY=/m);
  assert.doesNotMatch(env, /^NEXT_PUBLIC_OPENAI_API_KEY=/m);
  assert.match(aiRoute, /gpt-6-astra/);
  assert.match(aiRoute, /json_schema/);
  assert.match(realtimeRoute, /gpt-live-1/);
  assert.match(realtimeRoute, /client\.live\.create/);
  assert.match(realtimeRoute, /type:\s*["']webrtc["']/);
  const voiceClient = await readFile(new URL("../components/live-interview-panel.tsx", import.meta.url), "utf8");
  assert.match(voiceClient, /RTCPeerConnection/);
  assert.match(voiceClient, /session\.input_transcript\.delta/);
  assert.match(voiceClient, /Continue in text mode/i);
  assert.match(voiceClient, /Start video-style interview/i);
  assert.match(voiceClient, /Camera is an optional local self-view and is never sent to OpenAI/i);
  assert.match(voiceClient, /video:\s*\{\s*facingMode:\s*["']user["']/i);
  assert.doesNotMatch(voiceClient, /peer\.addTrack\([^\n]*cameraStream/i);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/brand-logo.png", import.meta.url));
  await access(new URL("../public/interviewer.png", import.meta.url));
});
