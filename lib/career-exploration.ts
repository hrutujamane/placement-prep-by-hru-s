import type { RoleExplorationActivity, RoleExplorationAttempt } from "@/lib/types";

export const roleExplorationActivities: RoleExplorationActivity[] = [
  activity(
    "explore-rf-wavelength",
    "RF Engineering",
    "Frequency, wavelength and antenna size",
    "How RF engineers connect frequency choices to physical dimensions and practical constraints.",
    ["Basic algebra"],
    25,
    ["Calculator or spreadsheet"],
    ["Choose three common frequencies.", "Calculate wavelength using c/f.", "Estimate quarter-wave length.", "Compare the physical sizes and record one practical trade-off."],
    "A small table of frequency, wavelength, quarter-wave length and one design observation.",
    ["Use 3 × 10^8 m/s for a first approximation.", "Keep units visible in every step."],
  ),
  activity(
    "explore-embedded-fsm",
    "Embedded Systems",
    "Button-controlled state machine",
    "How embedded engineers convert behavior into states, transitions and testable edge cases.",
    ["Basic logic", "Basic C or pseudocode"],
    35,
    ["Paper, flowchart tool or C simulator"],
    ["Define OFF, READY and ACTIVE states.", "Write the button event that changes each state.", "Add a long-press reset.", "Test bounce or repeated input in a simple simulation or trace table."],
    "A state diagram or trace table showing normal, repeated and reset inputs.",
    ["Start with a table before writing code.", "One input should cause one defined transition."],
  ),
  activity(
    "explore-signal-noise",
    "Signal Processing",
    "Compare clean and noisy signals",
    "How signal-processing engineers inspect data, define a metric and evaluate filtering trade-offs.",
    ["Sine-wave basics"],
    30,
    ["Python notebook, spreadsheet or graphing tool"],
    ["Create or plot a simple reference signal.", "Add a controlled disturbance.", "Apply one smoothing method.", "Compare the result with the reference using a stated observation or metric."],
    "Three plots or tables plus one honest statement about what improved and what became worse.",
    ["A spreadsheet is acceptable if Python is unfamiliar.", "Do not claim improvement without defining how you compared it."],
  ),
  activity(
    "explore-vlsi-logic",
    "VLSI",
    "Design and test a simple logic circuit",
    "How digital designers turn a requirement into logic and verify every input combination.",
    ["Truth tables"],
    30,
    ["Paper or a logic simulator"],
    ["Write a two-input alarm requirement.", "Create its truth table.", "Derive the Boolean expression.", "Build or simulate it and test every row."],
    "A requirement, truth table, logic expression and test result for every input combination.",
    ["Use only two inputs for the first attempt.", "A complete truth table is stronger evidence than a screenshot alone."],
  ),
  activity(
    "explore-automation-tank",
    "Industrial Automation",
    "Tank-level control sequence",
    "How automation engineers define sequences, interlocks and safe behavior before commissioning equipment.",
    ["Boolean logic"],
    35,
    ["Paper, spreadsheet or PLC simulator"],
    ["Define LOW and HIGH level inputs.", "Write when the pump may start and must stop.", "Add a conflicting-sensor fault.", "Run a trace for empty, filling, full and fault states."],
    "An input/output table and a trace demonstrating the normal sequence and safe fault response.",
    ["Use simulation only; do not wire a mains-powered pump.", "Write the safe default before the normal sequence."],
  ),
];

export function getExplorationActivityForTrack(track: string) {
  const normalized = track.toLowerCase();
  const direct = roleExplorationActivities.find((item) => normalized.includes(item.track.toLowerCase().split(" ")[0]));
  if (direct) return direct;
  if (/radar|antenna|microwave|wireless/.test(normalized)) return roleExplorationActivities.find((item) => item.track === "RF Engineering")!;
  if (/iot|robot|firmware/.test(normalized)) return roleExplorationActivities.find((item) => item.track === "Embedded Systems")!;
  if (/plc|automation|control/.test(normalized)) return roleExplorationActivities.find((item) => item.track === "Industrial Automation")!;
  if (/telecom|communication/.test(normalized)) return roleExplorationActivities.find((item) => item.track === "Signal Processing")!;
  return roleExplorationActivities.find((item) => item.track === "Embedded Systems")!;
}

export function explorationFitAdjustment(track: string, attempts: RoleExplorationAttempt[]) {
  return attempts
    .filter((attempt) => attempt.track === track)
    .reduce((score, attempt) => score + (attempt.enjoyed === "yes" ? 5 : attempt.enjoyed === "no" ? -2 : 1) + (attempt.wantsAnother ? 3 : 0), 0);
}

function activity(id: string, track: string, title: string, represents: string, prerequisites: string[], estimatedMinutes: number, requiredTools: string[], instructions: string[], expectedOutput: string, beginnerSupport: string[]): RoleExplorationActivity {
  return {
    id,
    track,
    title,
    represents,
    prerequisites,
    estimatedMinutes,
    requiredTools,
    instructions,
    expectedOutput,
    beginnerSupport,
    reflectionQuestions: ["Did you enjoy this?", "Which part interested you?", "Which part was difficult?", "Would you like another activity in this area?"],
  };
}
