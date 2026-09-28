import assert from "node:assert/strict";
import test from "node:test";
import { initialDemoState } from "../lib/demo-data.ts";
import { generateRoadmapFromGoal } from "../lib/roadmap-engine.ts";

function totalMinutes(roadmap) {
  return roadmap.tasks.reduce((sum, task) => sum + task.minutes, 0);
}

test("creates a radar roadmap whose mission exactly fits 90 minutes", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "I have 90 minutes today. Prepare me for a Radar internship.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  assert.equal(roadmap.track, "Radar Engineering");
  assert.equal(roadmap.availableMinutes, 90);
  assert.equal(totalMinutes(roadmap), 90);
  assert.equal(roadmap.tasks.length, 5);
  for (const task of roadmap.tasks) {
    assert.ok(task.skill);
    assert.ok(task.topics.length);
    assert.ok(task.completionCriteria);
    assert.ok(task.expectedOutcome);
    assert.ok(task.priority >= 1 && task.priority <= 5);
  }
});

test("changes the roadmap chart for an IoT goal and six-month deadline", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "I want an IoT internship in 6 months. I have 2 hours today.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  assert.equal(roadmap.track, "IoT");
  assert.equal(roadmap.durationWeeks, 26);
  assert.equal(roadmap.durationLabel, "6 months");
  assert.equal(roadmap.availableMinutes, 120);
  assert.equal(totalMinutes(roadmap), 120);
  assert.match(roadmap.milestones[0].title, /embedded|sensor/i);
});

test("fits a natural-language four-month time limit into exactly four months", () => {
  const started = new Date();
  const roadmap = generateRoadmapFromGoal({
    prompt: "I wanna be a telecom engineer and I have a time limit of 4 months",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  const target = new Date(`${roadmap.targetDate}T00:00:00`);
  const expected = new Date(started);
  expected.setMonth(expected.getMonth() + 4);
  const differenceDays = Math.abs((target.getTime() - expected.getTime()) / 86_400_000);
  assert.equal(roadmap.track, "Telecommunication");
  assert.equal(roadmap.durationWeeks, 18);
  assert.equal(roadmap.durationLabel, "4 months");
  assert.ok(differenceDays <= 1);
  assert.equal(roadmap.milestones.at(-1).endWeek, 18);
  assert.equal(roadmap.milestones.at(-1).dueDate, roadmap.targetDate);
});

test("adapts from previous progress without repeating completed work", () => {
  const first = generateRoadmapFromGoal({
    prompt: "Prepare me for Radar Engineering in 8 months. I have 90 minutes today.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  const previousTasks = first.tasks.map((task, index) => ({ ...task, status: index === 0 ? "completed" : "pending" }));
  const next = generateRoadmapFromGoal({
    prompt: "I have 90 minutes today",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
    previousTasks,
    previousRoadmap: first,
  });
  assert.equal(next.track, "Radar Engineering");
  assert.equal(next.adjusted, true);
  assert.equal(totalMinutes(next), 90);
  assert.ok(next.tasks.some((task) => task.carryForwardCount === 1));
  assert.ok(!next.tasks.some((task) => task.title === first.tasks[0].title));
});

test("never exceeds very small student time budgets", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "I have 15 minutes today. Teach me ESP32 basics.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  assert.equal(roadmap.availableMinutes, 15);
  assert.equal(totalMinutes(roadmap), 15);
  assert.equal(roadmap.tasks.length, 1);
});

test("turns a weekly study budget into a realistic daily mission", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "Prepare me for an RF engineering role in 8 months with 10 hours per week.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  assert.equal(roadmap.track, "RF Engineering");
  assert.equal(roadmap.weeklyHours, 10);
  assert.equal(roadmap.availableMinutes, 100);
  assert.equal(totalMinutes(roadmap), 100);
});

test("uses daily study time to calculate a sustainable weekly plan", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "I want an embedded internship in 6 months and can study 90 minutes per day.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
  });
  assert.equal(roadmap.track, "Embedded Systems");
  assert.equal(roadmap.availableMinutes, 90);
  assert.equal(roadmap.weeklyHours, 9);
  assert.equal(totalMinutes(roadmap), 90);
});

test("does not claim unrelated old tasks adjusted a brand-new career track", () => {
  const roadmap = generateRoadmapFromGoal({
    prompt: "I want an embedded internship in 6 months and can study 90 minutes per day.",
    profile: initialDemoState.profile,
    skills: initialDemoState.skills,
    previousTasks: initialDemoState.tasks,
  });
  assert.equal(roadmap.track, "Embedded Systems");
  assert.equal(roadmap.adjusted, false);
});
