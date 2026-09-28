import assert from "node:assert/strict";
import test from "node:test";
import { advanceInterviewProgram, averageInterviewScore, createInitialInterviewProgram, evaluateInterviewAnswer, getInterviewQuestion, interviewProgramDays } from "../lib/interview-engine.ts";
import { initialDemoState } from "../lib/demo-data.ts";

test("provides all fifteen adaptive interview stages", () => {
  assert.equal(interviewProgramDays.length, 15);
  assert.equal(createInitialInterviewProgram().currentDay, 1);
  assert.match(interviewProgramDays[0].title, /conversation/i);
  assert.match(interviewProgramDays[14].title, /final interview/i);
});

test("uses the student's saved project in project interview questions", () => {
  const question = getInterviewQuestion(7, initialDemoState.profile, initialDemoState.projects[0]);
  assert.match(question, /Low-Cost Doppler Radar Simulator/i);
  assert.match(question, /Synthetic signal generator/i);
});

test("scores a structured evidence-based answer above an incomplete answer", () => {
  const question = getInterviewQuestion(6, initialDemoState.profile, initialDemoState.projects[0]);
  const incomplete = evaluateInterviewAnswer("I made a radar project but I do not remember the details.", question, initialDemoState.projects[0], 0);
  const structured = evaluateInterviewAnswer(
    "The problem was to study target velocity estimation. I chose a synthetic signal generator because it lets me test controlled Doppler shifts. First I created the signal, then I used an FFT pipeline and checked the calculated frequency shift. The current evidence is the simulation output; hardware behavior is not tested yet. I would verify that next with repeatable test cases.",
    question,
    initialDemoState.projects[0],
    0,
  );
  assert.ok(averageInterviewScore(structured) > averageInterviewScore(incomplete));
  assert.ok(structured.scores.uncertaintyHandling > incomplete.scores.uncertaintyHandling);
});

test("repeats a weak checkpoint without losing completed days", () => {
  const program = initialDemoState.interviewProgram;
  const evaluation = evaluateInterviewAnswer("I am not sure and would need to check this before answering.", "Explain your strength with evidence.", undefined, 0);
  const result = advanceInterviewProgram(program, sessionFor(evaluation, 5, "Normal"));
  assert.equal(result.passed, false);
  assert.equal(result.program.currentDay, 5);
  assert.deepEqual(result.program.completedDays, [1, 2, 3, 4]);
  assert.match(result.program.lastAdjustmentMessage, /repeat/i);
});

test("advances a strong checkpoint and completes the final day", () => {
  const scores = { clarity: 84, relevance: 88, technicalAccuracy: 82, answerStructure: 86, communication: 85, completeness: 84, uncertaintyHandling: 90 };
  const evaluation = { scores, didWell: "Strong evidence.", improve: "Stay concise.", betterStructure: "Answer then evidence.", uncertaintyFeedback: "Handled honestly." };
  const dayFive = advanceInterviewProgram(initialDemoState.interviewProgram, sessionFor(evaluation, 5, "Normal"));
  assert.equal(dayFive.passed, true);
  assert.equal(dayFive.program.currentDay, 6);
  assert.ok(dayFive.program.completedDays.includes(5));

  const finalProgram = { ...dayFive.program, currentDay: 15, completedDays: Array.from({ length: 14 }, (_, index) => index + 1) };
  const final = advanceInterviewProgram(finalProgram, sessionFor(evaluation, 15, "Advanced"));
  assert.equal(final.program.status, "completed");
  assert.ok(final.program.completedDays.includes(15));
});

function sessionFor(evaluation, programDay, difficulty) {
  return {
    programDay,
    programTitle: interviewProgramDays[programDay - 1].title,
    personality: "Friendly Mentor",
    difficulty,
    confidenceMode: true,
    voiceEnabled: false,
    question: "A sufficiently detailed practice question?",
    answer: "A sufficiently detailed practice answer for the adaptive program.",
    retryCount: 0,
    beforeConfidence: 5,
    afterConfidence: 6,
    evaluation,
    evaluationSource: "local",
    averageScore: averageInterviewScore(evaluation),
  };
}
