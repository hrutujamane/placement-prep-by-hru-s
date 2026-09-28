import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createPlanAdjustment, undoPlanAdjustment } from "../lib/adaptive-planning.ts";
import { explorationFitAdjustment } from "../lib/career-exploration.ts";
import { evidenceReadinessScore, getEvidenceQuestions } from "../lib/evidence.ts";
import { matchProjectsToInventory } from "../lib/project-guidance.ts";

const preferences = {
  budget: 1000,
  currency: "INR",
  availableMinutes: 45,
  currentKnowledge: "Basic C",
  targetRole: "Embedded Systems",
  difficulty: "starter",
  mode: "hardware",
};

test("matches reviewed projects without assuming missing equipment", () => {
  const inventory = [
    equipment("Arduino Uno", "Uno R3 compatible"),
    equipment("Ultrasonic sensor", "HC-SR04"),
    equipment("Servo", "SG90"),
    equipment("16x2 I2C LCD", "PCF8574 backpack"),
    equipment("5V power supply", "5 V 2 A regulated", "power"),
    equipment("Breadboard and jumper wires", "Full size", "tool"),
  ];
  const match = matchProjectsToInventory(inventory, preferences).find((item) => item.template.id === "template-arduino-scanner");
  assert.ok(match);
  assert.equal(match.missing.length, 0);
  assert.equal(match.safetyQuestions.length, 0);
  assert.equal(match.template.reviewStatus, "reviewed");
});

test("reports unavailable requirements and pauses unsafe exact connections", () => {
  const inventory = [equipment("Arduino Uno", ""), equipment("Servo", "", "component", "uncertain")];
  const match = matchProjectsToInventory(inventory, preferences).find((item) => item.template.id === "template-arduino-scanner");
  assert.ok(match);
  assert.ok(match.missing.some((item) => item.name.includes("ultrasonic")));
  assert.ok(match.missing.some((item) => item.name.includes("supply")));
  assert.ok(match.safetyQuestions.some((question) => question.includes("Arduino Uno")));
});

test("replans within available time, preserves completed work and supports undo", () => {
  const tasks = [
    task("done", 30, "completed", "learn", 5),
    task("short", 20, "pending", "practice", 4),
    task("build", 40, "pending", "build", 5),
  ];
  const adjustment = createPlanAdjustment(tasks, { reason: "My components have not arrived.", availableMinutes: 20, today: "2026-09-21", targetDate: "2026-10-21", usualDailyMinutes: 45 });
  const todayMinutes = adjustment.afterTasks.filter((item) => item.scheduledFor === "2026-09-21" && item.status !== "completed").reduce((sum, item) => sum + item.minutes, 0);
  assert.ok(todayMinutes <= 20);
  assert.equal(adjustment.afterTasks.find((item) => item.id === "done")?.status, "completed");
  assert.equal(adjustment.afterTasks.find((item) => item.id === "build")?.status, "rescheduled");
  assert.deepEqual(undoPlanAdjustment(adjustment), tasks);
});

test("prevents duplicate evidence from inflating readiness", () => {
  const base = {
    id: "e1", projectId: "p1", skillIds: ["s1"], type: "test_observation", title: "Test", content: "Result", status: "AI-reviewed",
    submittedAt: "2026-09-21T00:00:00Z", reviewMethod: "ai", simulated: false, fingerprint: "same",
  };
  const one = evidenceReadinessScore([base]);
  const duplicate = evidenceReadinessScore([base, { ...base, id: "e2" }]);
  const submitted = evidenceReadinessScore([{ ...base, id: "e3", status: "Submitted", reviewMethod: "none" }]);
  assert.equal(duplicate.score, one.score);
  assert.equal(duplicate.countedRecords, 1);
  assert.equal(submitted.score, 0);
});

test("grounds evidence explanation questions in saved project facts", () => {
  const project = { id: "p1", name: "Servo Scanner", status: "Testing", description: "Scan obstacles", technologies: ["Arduino C"], components: ["HC-SR04"], progress: 50, nextMilestone: "Test invalid echo" };
  const questions = getEvidenceQuestions(project, { type: "source_code" });
  assert.ok(questions.some((question) => question.includes("HC-SR04")));
  assert.ok(questions.some((question) => question.includes("Arduino C")));
  assert.ok(questions.some((question) => question.includes("selected files")));
});

test("career exploration feedback refines rather than excludes a track", () => {
  const positive = explorationFitAdjustment("RF Engineering", [{ id: "a", activityId: "rf", track: "RF Engineering", completedAt: "2026-09-21", enjoyed: "yes", interestingPart: "wavelength", difficultPart: "units", wantsAnother: true, outputNote: "table" }]);
  const weakAttempt = explorationFitAdjustment("RF Engineering", [{ id: "b", activityId: "rf", track: "RF Engineering", completedAt: "2026-09-21", enjoyed: "no", interestingPart: "", difficultPart: "units", wantsAnother: false, outputNote: "partial" }]);
  assert.equal(positive, 8);
  assert.equal(weakAttempt, -2);
  assert.ok(weakAttempt > -10);
});

test("ships permission boundaries, private evidence storage and text fallback", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202609210004_connected_engineering_journey.sql", import.meta.url), "utf8");
  const interview = await readFile(new URL("../components/interview-page.tsx", import.meta.url), "utf8");
  const voiceInterview = await readFile(new URL("../components/live-interview-panel.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../components/project-workspace.tsx", import.meta.url), "utf8");
  assert.match(migration, /permission_scope jsonb/i);
  assert.match(migration, /selected_resources jsonb/i);
  assert.match(migration, /evidence-private/i);
  assert.match(migration, /mentor_authorizations/i);
  assert.match(`${interview}\n${voiceInterview}`, /Continue in text mode or retry/i);
  assert.match(workspace, /only the selected link is stored/i);
  assert.match(workspace, /code ran unless an execution result is explicitly documented/i);
});

function equipment(name, model, category = "component", status = "working") {
  return { id: `equipment-${name}`, name, model, quantity: 1, status, category, notes: "" };
}

function task(id, minutes, status, type, priority) {
  return { id, title: id, detail: id, minutes, type, status, skill: id, topics: [id], priority, completionCriteria: id, expectedOutcome: id, scheduledFor: "2026-09-21", carryForwardCount: 0 };
}
