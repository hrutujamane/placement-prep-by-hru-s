import assert from "node:assert/strict";
import test from "node:test";
import { buildVoiceInterviewPrompts, liveInterviewSessionRequestSchema } from "../lib/voice-interview.ts";

const context = {
  programDay: 7,
  programTitle: "Project cross-questioning",
  personality: "Technical Engineer",
  difficulty: "Advanced",
  confidenceMode: false,
  openingQuestion: "Explain your radar project and its current evidence.",
  previousFeedback: "Explain the testing process more clearly.",
  profile: {
    name: "Demo Student",
    branch: "ENTC",
    targetRoles: ["RF and Radar Engineer"],
    existingSkills: ["Communication Systems", "MATLAB"],
  },
  project: {
    id: "project-1",
    name: "Low-Cost Doppler Radar Simulator",
    description: "A simulation for controlled Doppler shifts.",
    status: "Testing",
    technologies: ["MATLAB", "FFT"],
    components: ["Synthetic signal generator"],
  },
  evidence: [{
    title: "FFT output comparison",
    type: "test_observation",
    status: "AI-reviewed",
    actualResult: "A simulated frequency shift was observed.",
    limitations: "Physical RF hardware has not been tested.",
    personalContribution: "Created the signal and comparison script.",
  }],
};

test("builds an adaptive basic-to-advanced voice interview from saved facts", () => {
  const prompts = buildVoiceInterviewPrompts(context);
  assert.match(prompts.liveInstructions, /Ask exactly one question at a time/i);
  assert.match(prompts.liveInstructions, /fundamentals.*advanced scenarios/is);
  assert.match(prompts.backendInstructions, /definitions and fundamentals/i);
  assert.match(prompts.backendInstructions, /testing\/debugging\/evidence/i);
  assert.match(prompts.contextMessage, /Low-Cost Doppler Radar Simulator/);
  assert.match(prompts.contextMessage, /Physical RF hardware has not been tested/);
  assert.match(prompts.contextMessage, /untrusted student records/i);
  assert.match(prompts.startInstruction, /AI interviewer/i);
});

test("validates bounded SDP and interview context before creating a live session", () => {
  const valid = liveInterviewSessionRequestSchema.safeParse({ sdp: "v=0\n".repeat(10), interview: context });
  assert.equal(valid.success, true);
  const invalid = liveInterviewSessionRequestSchema.safeParse({ sdp: "short", interview: context });
  assert.equal(invalid.success, false);
});
