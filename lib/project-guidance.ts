import type { BuildPreferences, EquipmentItem, ProjectTemplate, ProjectTemplateComponent } from "@/lib/types";

export interface ProjectMatch {
  template: ProjectTemplate;
  score: number;
  available: ProjectTemplateComponent[];
  missing: ProjectTemplateComponent[];
  optionalUpgrades: ProjectTemplateComponent[];
  safetyQuestions: string[];
  feasibilityNote: string;
}

export const reviewedProjectTemplates: ProjectTemplate[] = [
  {
    id: "template-arduino-scanner",
    title: "Arduino Distance Scanner",
    track: "Embedded Systems",
    problemStatement: "Create a small scanning system that measures distance at several angles and displays the nearest detected obstacle.",
    careerRelevance: "Practises sensor integration, actuator control, timing, interface constraints, testing and embedded debugging.",
    learningOutcomes: ["Read a timed digital sensor", "Control a servo without blocking the loop", "Display measured state", "Design repeatable boundary tests"],
    prerequisites: ["Basic C", "Digital input/output", "Voltage and current basics"],
    components: [
      component("Arduino Uno", ["arduino", "uno", "arduino uno"], 1, "required", "component", "Confirm the exact Uno-compatible board and USB connector."),
      component("HC-SR04 ultrasonic sensor", ["hc-sr04", "ultrasonic", "ultrasonic sensor"], 1, "required", "component", "Confirm the sensor model before using timing or voltage assumptions."),
      component("SG90 micro servo", ["sg90", "servo", "micro servo"], 1, "required", "component", "Confirm the servo model and stall-current requirement.", "Use a suitable 5 V supply; do not assume the board regulator can safely supply servo stall current."),
      component("16x2 I2C LCD", ["lcd", "16x2", "i2c lcd"], 1, "required", "component", "Confirm the backpack/controller and I2C address."),
      component("5 V regulated supply", ["5v supply", "regulated supply", "power supply"], 1, "required", "power", "Confirm current capacity and connector polarity.", "Supply capacity must cover the servo startup current with margin."),
      component("Breadboard and jumper wires", ["breadboard", "jumper", "jumper wires"], 1, "required", "tool"),
      component("Decoupling capacitor", ["capacitor", "electrolytic capacitor"], 1, "optional", "component"),
    ],
    architecture: ["Ultrasonic sensor → Arduino timing logic", "Arduino → servo angle control", "Arduino → I2C LCD status", "Regulated supply → servo and logic with reviewed grounding"],
    connections: ["Connect only after confirming the exact servo, LCD backpack and supply model.", "Keep the servo power path separate from USB power where the reviewed supply plan requires it.", "Use the board pin map in the saved implementation checklist; record any substitutions."],
    voltageAndPower: ["Arduino Uno logic is normally 5 V, but clone-board details must be confirmed.", "Servo current can exceed logic-board regulator capacity during startup or stall.", "Verify supply voltage, current capacity, polarity and common-ground requirements before power-up."],
    softwareSetup: ["Arduino IDE or PlatformIO", "Servo and compatible LCD libraries", "Serial monitor", "Git repository with test notes"],
    implementationStages: ["Confirm models and power plan", "Read stationary distance samples", "Move servo through a limited safe range", "Combine scan and display", "Add invalid-reading handling", "Run repeatable tests", "Submit evidence"],
    expectedResults: ["Distance readings are recorded at defined angles", "Invalid or out-of-range readings are handled visibly", "Servo movement does not reset the controller under the reviewed power setup"],
    testingChecklist: ["Test known distances", "Test no-echo and invalid input", "Observe supply stability during servo movement", "Repeat the full scan ten times", "Record expected versus actual results"],
    debuggingDecisionTree: ["No sensor reading → verify model, supply and pin mapping → inspect timing logs", "Controller resets → disconnect servo load → verify supply capacity and grounding", "LCD blank → confirm address and backpack model → run an I2C scan"],
    limitations: ["Ultrasonic reflections depend on object shape and surface", "This is not a safety-rated obstacle detector", "Servo angle accuracy is approximate unless calibrated"],
    upgrades: ["Add non-blocking scheduling", "Log scan data", "Compare filtering methods"],
    estimatedMinutes: 360,
    difficulty: "starter",
    mode: "hardware",
    source: "Placement Prep internal reviewed starter-template catalog",
    revision: "1.1",
    compatibilityNotes: "Reviewed for an Arduino Uno-class 5 V board, HC-SR04-class sensor, SG90-class servo and common I2C LCD backpack; substitutions require a new compatibility check.",
    reviewStatus: "reviewed",
    reviewedAt: "2026-09-21",
  },
  {
    id: "template-radar-simulation",
    title: "Doppler Radar Signal Simulator",
    track: "Radar Engineering",
    problemStatement: "Simulate a returned radar signal, estimate Doppler frequency and compare the estimated velocity with a known input.",
    careerRelevance: "Connects signals, FFT analysis, measurement error and radar assumptions without requiring RF hardware.",
    learningOutcomes: ["Relate Doppler frequency to velocity", "Generate noisy signals", "Use an FFT responsibly", "Report estimation error and limitations"],
    prerequisites: ["Signals and Systems basics", "Python basics", "Basic trigonometry"],
    components: [
      component("Computer", ["computer", "laptop", "pc"], 1, "required", "tool"),
      component("Python environment", ["python", "jupyter", "colab"], 1, "required", "software"),
      component("NumPy and Matplotlib", ["numpy", "matplotlib", "scipy"], 1, "required", "software"),
      component("SDR hardware", ["sdr", "rtl-sdr", "hackrf"], 1, "optional", "component"),
    ],
    architecture: ["Known target parameters → synthetic echo", "Echo + controlled noise → sampled signal", "FFT/peak estimator → Doppler estimate", "Estimate → velocity and error report"],
    connections: ["No physical wiring is required for the reviewed simulation path."],
    voltageAndPower: ["Simulation-only template; no electrical power guidance is implied."],
    softwareSetup: ["Python 3", "NumPy", "Matplotlib", "Optional Jupyter notebook"],
    implementationStages: ["Document assumptions", "Generate a clean echo", "Add controlled noise", "Estimate Doppler frequency", "Calculate velocity", "Sweep signal-to-noise conditions", "Document evidence"],
    expectedResults: ["Estimated velocity is compared with the known simulated value", "Error changes are visible across noise conditions", "Assumptions and sampling limits are documented"],
    testingChecklist: ["Test zero velocity", "Test positive and negative velocity", "Test frequency near FFT-bin boundaries", "Test multiple noise levels", "Record expected versus actual values"],
    debuggingDecisionTree: ["Wrong peak → inspect sampling rate and FFT axis", "Aliasing → compare signal bandwidth with Nyquist limit", "Unstable estimate → increase observation time or compare window functions"],
    limitations: ["Synthetic data does not prove RF hardware performance", "Single-target assumptions do not represent every radar scene", "FFT resolution limits the estimate"],
    upgrades: ["Add multiple targets", "Compare window functions", "Import explicitly selected recorded data"],
    estimatedMinutes: 300,
    difficulty: "intermediate",
    mode: "simulation",
    source: "Placement Prep internal reviewed starter-template catalog",
    revision: "1.0",
    compatibilityNotes: "Reviewed for a local Python or notebook simulation. SDR capture is an optional, separately reviewed extension.",
    reviewStatus: "reviewed",
    reviewedAt: "2026-09-21",
  },
  {
    id: "template-signal-noise",
    title: "Clean vs Noisy Signal Lab",
    track: "Signal Processing",
    problemStatement: "Generate a known signal, add controlled noise and compare simple smoothing and frequency-domain filtering approaches.",
    careerRelevance: "Represents the measurement, filtering and trade-off reasoning used in signal-processing work.",
    learningOutcomes: ["Measure signal-to-noise changes", "Compare time and frequency views", "Avoid claiming improvement without a metric"],
    prerequisites: ["Python basics", "Sine waves", "Basic plotting"],
    components: [component("Computer", ["computer", "laptop", "pc"], 1, "required", "tool"), component("Python environment", ["python", "jupyter", "colab"], 1, "required", "software")],
    architecture: ["Reference signal → noise injection → filter candidates → metric and plots"],
    connections: ["No physical wiring is required."],
    voltageAndPower: ["Simulation-only template."],
    softwareSetup: ["Python", "NumPy", "Matplotlib"],
    implementationStages: ["Create reference signal", "Add seeded noise", "Visualize both domains", "Apply two filters", "Compare a defined metric", "Record limitations"],
    expectedResults: ["Plots and metrics distinguish the reference, noisy and filtered signals"],
    testingChecklist: ["Repeat with a fixed random seed", "Change noise level", "Check phase or edge distortion", "Record metric assumptions"],
    debuggingDecisionTree: ["Unexpected spectrum → verify sampling rate", "Filter distorts signal → inspect cutoff and order", "Results change each run → set and record a random seed"],
    limitations: ["Synthetic noise is not every real sensor-noise source", "A better metric does not guarantee better application performance"],
    upgrades: ["Use an explicitly selected recorded signal", "Compare computational cost"],
    estimatedMinutes: 180,
    difficulty: "starter",
    mode: "simulation",
    source: "Placement Prep internal reviewed starter-template catalog",
    revision: "1.0",
    compatibilityNotes: "Reviewed for Python-based simulation only.",
    reviewStatus: "reviewed",
    reviewedAt: "2026-09-21",
  },
  {
    id: "template-vlsi-fsm",
    title: "Verified Button-Controlled State Machine",
    track: "VLSI",
    problemStatement: "Design a small debounced state machine, write a testbench and inspect expected and unexpected transitions.",
    careerRelevance: "Represents RTL design, verification, waveform inspection and specification-driven debugging.",
    learningOutcomes: ["Translate behavior into states", "Write synthesizable RTL", "Create self-checking tests", "Explain timing limitations"],
    prerequisites: ["Digital logic", "Basic Verilog or SystemVerilog"],
    components: [component("Computer", ["computer", "laptop", "pc"], 1, "required", "tool"), component("HDL simulator", ["iverilog", "verilator", "modelsim", "eda playground"], 1, "required", "software")],
    architecture: ["Input conditioning → finite-state machine → registered output", "Testbench → clock/reset/input sequences → assertions and waveform"],
    connections: ["No physical wiring is required for the reviewed simulation path."],
    voltageAndPower: ["Simulation-only template."],
    softwareSetup: ["Icarus Verilog, Verilator, ModelSim or a reviewed browser simulator", "Waveform viewer", "Git"],
    implementationStages: ["Write behavior specification", "Draw states and transitions", "Implement RTL", "Write normal tests", "Add invalid and reset tests", "Review waveform", "Document evidence"],
    expectedResults: ["Every specified transition is tested", "Reset behavior is visible", "Unexpected inputs have documented behavior"],
    testingChecklist: ["Reset from every state", "Rapid input changes", "Invalid input sequence", "Expected output timing", "Self-checking pass/fail result"],
    debuggingDecisionTree: ["Wrong state → inspect transition condition", "Unknown values → initialize/reset signals", "Timing mismatch → compare blocking and non-blocking assignments"],
    limitations: ["Simulation does not prove final silicon timing", "Mechanical button behavior is represented only by the chosen input model"],
    upgrades: ["Add assertions", "Run lint", "Target an FPGA after a separate board review"],
    estimatedMinutes: 240,
    difficulty: "intermediate",
    mode: "simulation",
    source: "Placement Prep internal reviewed starter-template catalog",
    revision: "1.0",
    compatibilityNotes: "Reviewed for RTL simulation. FPGA pin assignments and electrical constraints are outside this template.",
    reviewStatus: "reviewed",
    reviewedAt: "2026-09-21",
  },
  {
    id: "template-tank-control",
    title: "Tank-Level Control Sequence",
    track: "Industrial Automation",
    problemStatement: "Simulate a tank controller with level inputs, pump interlocks, alarms and a safe default state.",
    careerRelevance: "Represents sequence control, interlocks, fault handling and commissioning logic used in automation.",
    learningOutcomes: ["Create a control sequence", "Design interlocks", "Test sensor conflicts", "Explain fail-safe choices"],
    prerequisites: ["Boolean logic", "Basic control-system vocabulary"],
    components: [component("Computer", ["computer", "laptop", "pc"], 1, "required", "tool"), component("PLC simulator", ["plc simulator", "codesys", "openplc", "ladder simulator"], 1, "required", "software")],
    architecture: ["Simulated level inputs → sequence/interlock logic → pump and alarm outputs"],
    connections: ["No physical mains or pump wiring is included. The reviewed path is simulation only."],
    voltageAndPower: ["Do not transfer this simulation directly to mains-powered equipment without qualified electrical review."],
    softwareSetup: ["A PLC or ladder-logic simulator", "A saved input/output table", "Test-case worksheet"],
    implementationStages: ["Define states and I/O", "Implement normal fill logic", "Add high/low interlocks", "Add conflicting-sensor fault", "Run test matrix", "Document evidence"],
    expectedResults: ["The pump is never commanded during a defined fault", "Every transition is traceable to an input condition"],
    testingChecklist: ["Empty-to-full sequence", "Stuck-high sensor", "Conflicting sensors", "Restart behavior", "Manual stop"],
    debuggingDecisionTree: ["Pump never starts → inspect permissives", "Pump never stops → inspect high-level edge and latch", "Conflicting outputs → review state priority"],
    limitations: ["Simulation omits real electrical noise, contactors and process dynamics", "Not a safety-certified control design"],
    upgrades: ["Add HMI status", "Add timers and trend logging", "Seek mentor review before physical deployment"],
    estimatedMinutes: 210,
    difficulty: "starter",
    mode: "simulation",
    source: "Placement Prep internal reviewed starter-template catalog",
    revision: "1.0",
    compatibilityNotes: "Reviewed for simulation. Physical PLC, pump and mains wiring require separate qualified review.",
    reviewStatus: "reviewed",
    reviewedAt: "2026-09-21",
  },
];

export function matchProjectsToInventory(inventory: EquipmentItem[], preferences: BuildPreferences): ProjectMatch[] {
  return reviewedProjectTemplates
    .filter((template) => template.reviewStatus === "reviewed")
    .map((template) => buildMatch(template, inventory, preferences))
    .sort((first, second) => second.score - first.score);
}

export function findProjectTemplate(templateId: string | undefined) {
  return reviewedProjectTemplates.find((template) => template.id === templateId);
}

function buildMatch(template: ProjectTemplate, inventory: EquipmentItem[], preferences: BuildPreferences): ProjectMatch {
  const available: ProjectTemplateComponent[] = [];
  const missing: ProjectTemplateComponent[] = [];
  const optionalUpgrades: ProjectTemplateComponent[] = [];
  const safetyQuestions: string[] = [];

  for (const requirement of template.components) {
    const matched = inventory.find((item) => item.status === "working" && item.quantity >= requirement.quantity && matchesComponent(item, requirement));
    if (requirement.requirement === "optional") {
      if (!matched) optionalUpgrades.push(requirement);
      continue;
    }
    if (matched) {
      available.push(requirement);
      if (template.mode === "hardware" && requirement.modelNotes && !matched.model?.trim()) {
        safetyQuestions.push(`What is the exact model or marking for your ${matched.name}? ${requirement.modelNotes}`);
      }
    } else {
      missing.push(requirement);
    }
  }

  const requiredCount = template.components.filter((item) => item.requirement === "required").length || 1;
  const equipmentCoverage = available.length / requiredCount;
  const normalizedRole = preferences.targetRole.toLowerCase();
  const roleMatch = normalizedRole.includes(template.track.toLowerCase().split(" ")[0]) || template.track.toLowerCase().includes(normalizedRole.split(" ")[0]);
  const modeMatch = preferences.mode === "either" || preferences.mode === template.mode;
  const difficultyMatch = preferences.difficulty === template.difficulty || preferences.difficulty === "advanced";
  const sessionFit = preferences.availableMinutes >= Math.min(60, Math.ceil(template.estimatedMinutes / 6));
  const score = Math.round(equipmentCoverage * 55 + (roleMatch ? 25 : 8) + (modeMatch ? 10 : 0) + (difficultyMatch ? 5 : 0) + (sessionFit ? 5 : 0));
  const feasibilityNote = missing.length === 0
    ? safetyQuestions.length > 0
      ? "Equipment appears available, but exact connection guidance is paused until the listed model or power details are confirmed."
      : "Feasible with the equipment currently marked as working."
    : template.mode === "hardware"
      ? "Some required equipment is missing. Use the listed simulation or preparation work until it is available."
      : "Install or confirm the missing software/tool before starting the implementation stage.";

  return { template, score, available, missing, optionalUpgrades, safetyQuestions, feasibilityNote };
}

function matchesComponent(item: EquipmentItem, requirement: ProjectTemplateComponent) {
  const candidate = `${item.name} ${item.model ?? ""}`.toLowerCase();
  return requirement.aliases.some((alias) => candidate.includes(alias.toLowerCase()));
}

function component(name: string, aliases: string[], quantity: number, requirement: ProjectTemplateComponent["requirement"], category: ProjectTemplateComponent["category"], modelNotes?: string, powerNotes?: string): ProjectTemplateComponent {
  return { name, aliases, quantity, requirement, category, modelNotes, powerNotes };
}
