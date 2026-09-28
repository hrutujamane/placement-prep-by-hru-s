import type { MissionTask, MissionTaskType, Profile, RoadmapPlan, Skill } from "@/lib/types";
import type { RoadmapDraft } from "@/lib/roadmap-schema";

type TrackTemplate = {
  track: string;
  aliases: string[];
  focus: string;
  difficulty: string;
  prerequisites: string[];
  starterTopics: string[];
  sequence: string[];
};

const templates: TrackTemplate[] = [
  track("Radar Engineering", ["radar", "doppler"], "Build the signal, RF and radar foundations needed to implement and explain a credible radar project.", "High foundation", ["Network Theory", "Signals & Systems", "Communication Systems"], ["Signals & Systems fundamentals", "Signal classification and LTI systems", "GATE signals practice", "Radar concept preview", "Revision evidence"], ["Signals bridge", "Communication + EM foundation", "Transmission lines + antennas", "RF + microwave systems", "Radar fundamentals + DSP", "Project proof + interviews"]),
  track("RF Engineering", ["rf engineer", "radio frequency", "rf ", "wireless hardware"], "Develop RF circuit intuition, transmission-line analysis and practical measurement readiness.", "High foundation", ["Network Theory", "Signals & Systems", "Electromagnetic Theory"], ["Network and signals bridge", "Transmission-line fundamentals", "Impedance-matching practice", "RF measurement preview", "Revision evidence"], ["Mathematics + network bridge", "Signals + communication", "EM + transmission lines", "Antennas + microwave", "RF design + measurement", "Portfolio + interview proof"]),
  track("Embedded Systems", ["embedded", "firmware", "microcontroller", "stm32"], "Build reliable firmware skills from C fundamentals through interfaces, debugging and project evidence.", "Moderate", ["Digital Electronics"], ["Embedded C foundations", "Bitwise and memory practice", "Microcontroller architecture", "GPIO mini task", "Code evidence"], ["C + digital foundation", "Microcontroller core", "UART + SPI + I2C", "Drivers + debugging", "RTOS + reliability", "Project + placement proof"]),
  track("IoT", ["iot", "esp32", "smart irrigation", "connected device"], "Combine embedded hardware, sensors, networking and reliable telemetry into a tested IoT system.", "Moderate", ["Embedded C"], ["IoT architecture", "Sensors and actuators", "ESP32 fundamentals", "MQTT practice", "Architecture evidence"], ["Embedded + sensor foundation", "Connectivity + MQTT", "Data + dashboard", "Reliability + security", "Integrated IoT project", "Portfolio + interview proof"]),
  track("Antenna Engineering", ["antenna", "propagation"], "Develop electromagnetic, propagation, simulation and antenna-measurement capability.", "High foundation", ["Electromagnetic Theory", "Transmission Lines"], ["Electromagnetic field review", "Transmission-line bridge", "Antenna parameters", "Radiation-pattern practice", "Simulation evidence"], ["EM foundation", "Transmission lines", "Antenna fundamentals", "Design + simulation", "Measurement + optimization", "Portfolio design study"]),
  track("Microwave Engineering", ["microwave", "s-parameter", "s parameter"], "Move from transmission-line fundamentals to microwave networks, components and measurements.", "High foundation", ["Electromagnetic Theory", "Transmission Lines"], ["Transmission-line equations", "Reflection coefficient", "Smith-chart practice", "S-parameter concepts", "Worked evidence"], ["EM + line bridge", "Matching networks", "Microwave networks", "Passive components", "Measurement workflow", "Design evidence"]),
  track("VLSI", ["vlsi", "verilog", "systemverilog", "rtl", "chip design"], "Progress from digital logic to RTL design, verification and semiconductor workflows.", "High foundation", ["Digital Electronics"], ["Digital logic review", "Verilog syntax", "Combinational RTL practice", "Testbench basics", "Waveform evidence"], ["Digital design bridge", "RTL with Verilog", "Verification basics", "Timing + synthesis", "Design project", "Portfolio + interviews"]),
  track("Semiconductor Engineering", ["semiconductor", "fabrication", "device physics"], "Build device-physics, fabrication and characterization knowledge for semiconductor roles.", "High foundation", ["Analog Electronics", "Engineering Mathematics"], ["Semiconductor physics", "PN junction review", "MOS device fundamentals", "Device numerical practice", "Model evidence"], ["Physics + mathematics bridge", "Diodes + transistors", "Fabrication", "Characterization", "Process or model project", "Industry preparation"]),
  track("Signal Processing", ["signal processing", "dsp", "image processing", "audio processing"], "Build mathematical signal intuition, DSP implementation skill and measurable project evidence.", "High foundation", ["Signals & Systems", "Engineering Mathematics"], ["Signal classification", "LTI systems", "Fourier transform practice", "Python signal task", "Plot evidence"], ["Signals bridge", "Transforms + sampling", "Digital filters", "Statistical signals", "Applied DSP project", "Portfolio + interviews"]),
  track("Wireless Communication", ["wireless communication", "wireless", "5g", "modulation"], "Develop modulation, channel, link-budget and software-radio fundamentals.", "High foundation", ["Signals & Systems", "Communication Systems"], ["Signals and spectra", "Digital modulation", "Noise and SNR practice", "Link-budget task", "Simulation evidence"], ["Signals + probability", "Digital communication", "Channels + link budgets", "Coding + multiple access", "SDR project", "Role preparation"]),
  track("Telecommunication", ["telecommunication", "telecom"], "Connect communication theory with transmission, network planning and telecom operations.", "Moderate", ["Communication Systems"], ["Communication-system review", "Transmission fundamentals", "Telecom network architecture", "Link planning practice", "Network evidence"], ["Communication foundation", "Transmission systems", "Telecom networks", "Planning + optimization", "Operations project", "Role preparation"]),
  track("Networking", ["networking", "network engineer", "computer network", "ccna"], "Build practical TCP/IP, routing, Linux and network-troubleshooting capability.", "Moderate", ["Digital Electronics"], ["OSI and TCP/IP", "IP addressing", "Subnetting practice", "Packet capture task", "Troubleshooting evidence"], ["Network foundation", "Addressing + routing", "Services + Linux", "Security + troubleshooting", "Network lab project", "Role preparation"]),
  track("PLC", ["plc", "ladder logic", "scada", "hmi"], "Learn PLC programming, interlocks, HMI and safe industrial control.", "Moderate", ["Digital Electronics"], ["PLC architecture", "Digital I/O", "Ladder logic basics", "Interlock mini task", "Simulation evidence"], ["PLC foundation", "Ladder logic", "Sensors + actuators", "HMI + SCADA", "Control project", "Commissioning preparation"]),
  track("Industrial Automation", ["industrial automation", "automation", "control system"], "Integrate sensors, drives, controllers and industrial communication into safe automation systems.", "Moderate", ["Digital Electronics", "Control Systems"], ["Automation architecture", "Sensors and actuators", "Control-system review", "Sequence design", "Safety evidence"], ["Control foundation", "Controllers + I/O", "Drives + motion", "Industrial networks", "Automation project", "Portfolio + interviews"]),
  track("Robotics", ["robotics", "robot", "ros"], "Combine sensing, embedded control, kinematics and software into a tested robotic system.", "Moderate to high", ["Embedded C", "Control Systems"], ["Robot system architecture", "Sensors and actuators", "Control basics", "Kinematics practice", "Simulation evidence"], ["Embedded + control bridge", "Kinematics + motion", "ROS + software", "Perception", "Robot project", "Portfolio + interviews"]),
  track("Core Electronics", ["core electronics", "analog electronics", "electronics design", "pcb"], "Strengthen analog, digital, measurement and electronic product-development skills.", "Moderate", ["Network Theory", "Digital Electronics"], ["Circuit-analysis review", "Analog building blocks", "Digital interface review", "SPICE mini task", "Measurement evidence"], ["Circuit foundation", "Analog design", "Digital + interfaces", "PCB + power", "Electronics project", "Portfolio + interviews"]),
  track("Software / IT", ["software", "developer", "it role", "web development", "dsa"], "Build programming, problem-solving, development and interview readiness for software roles open to ENTC students.", "Moderate", [], ["Programming fundamentals", "Data structures", "Problem-solving practice", "Git mini task", "Code evidence"], ["Programming foundation", "Data structures + algorithms", "Databases + networks", "Application development", "Placement preparation", "Portfolio + interviews"]),
  track("AI + Electronics", ["ai + electronics", "edge ai", "tinyml", "machine learning", "artificial intelligence"], "Combine data, machine learning and embedded deployment for intelligent electronic systems.", "High foundation", ["Embedded C", "Signals & Systems"], ["Python and data review", "Signal feature basics", "ML workflow", "Tiny model experiment", "Result evidence"], ["Python + signals bridge", "Machine-learning foundation", "Embedded systems bridge", "Edge deployment", "Intelligent-device project", "Portfolio + interviews"]),
  track("GATE + Placement", ["gate", "placement", "job ready", "internship"], "Use shared ENTC/ECE fundamentals efficiently while balancing GATE practice with placement evidence.", "Adaptive", [], ["Signals & Systems fundamentals", "Core-subject practice", "GATE numerical set", "Placement concept check", "Revision evidence"], ["Diagnostic + shared foundation", "Signals + digital + analog", "Communication + control", "Role-specific skill", "Project + mock tests", "Revision + interviews"]),
];

const fallbackTemplate = templates.at(-1)!;

export function generateRoadmapFromGoal({ prompt, profile, skills, previousTasks = [], previousRoadmap }: { prompt: string; profile: Profile; skills: Skill[]; previousTasks?: MissionTask[]; previousRoadmap?: RoadmapPlan }): RoadmapPlan {
  const request = prompt.trim();
  const normalized = request.toLowerCase();
  const explicitTemplate = templates.find((template) => template.aliases.some((alias) => normalized.includes(alias)));
  const previousTemplate = previousRoadmap ? templates.find((template) => template.track === previousRoadmap.track) : undefined;
  const profileTemplate = templates.find((template) => profile.targetRoles.some((role) => template.aliases.some((alias) => role.toLowerCase().includes(alias))));
  const template = explicitTemplate ?? previousTemplate ?? profileTemplate ?? fallbackTemplate;
  const availableMinutes = parseAvailableMinutes(normalized, profile);
  const explicitDuration = parseExplicitDuration(normalized);
  const durationWeeks = parseDurationWeeks(profile.targetDate, previousRoadmap?.durationWeeks, explicitDuration);
  const targetDate = calculateTargetDate(normalized, profile.targetDate, durationWeeks, explicitDuration);
  const weeklyHours = parseWeeklyHours(normalized, profile);
  const milestones = createMilestones(template, durationWeeks, targetDate, skills);
  const relevantPrevious = previousRoadmap?.track === template.track;
  const incomplete = relevantPrevious ? previousTasks.filter((task) => !["completed", "skipped"].includes(task.status) && task.priority >= 4).slice(0, 1) : [];
  const completionRate = relevantPrevious && previousTasks.length ? previousTasks.filter((task) => task.status === "completed").length / previousTasks.length : 1;
  const adjusted = incomplete.length > 0 || completionRate < 0.8;
  const tasks = createMissionTasks(template, availableMinutes, incomplete, previousTasks);
  const missingPrerequisites = template.prerequisites.filter((name) => (skills.find((skill) => skill.name === name)?.progress ?? 0) < 60);

  return {
    id: createUuid(), request, goal: goalLabel(normalized, template.track), track: template.track, focus: template.focus,
    availableMinutes, weeklyHours, difficulty: completionRate < 0.6 ? "Foundation-first" : template.difficulty,
    durationWeeks, durationLabel: explicitDuration?.label ?? formatDurationWeeks(durationWeeks), targetDate, createdAt: new Date().toISOString(), adjusted,
    adjustmentMessage: adjusted ? "Important unfinished work was carried forward without overloading today." : "The roadmap matches your current pace and available time.",
    bridgeMessage: missingPrerequisites.length ? `${missingPrerequisites.join(" and ")} need strengthening. A bridge runs alongside light ${template.track} exposure, so you are not blocked.` : undefined,
    nextStep: tasks[0]?.title ?? milestones[0].title,
    milestones, tasks, allocation: allocationFor(template.track),
  };
}

export function applyAiRoadmapDraft(base: RoadmapPlan, draft: RoadmapDraft): RoadmapPlan {
  return { ...base, goal: draft.goal, focus: draft.focus, difficulty: draft.difficulty, nextStep: draft.nextStep, tasks: fitDraftTasks(draft.tasks, base.availableMinutes) };
}

function track(trackName: string, aliases: string[], focus: string, difficulty: string, prerequisites: string[], starterTopics: string[], sequence: string[]): TrackTemplate {
  return { track: trackName, aliases, focus, difficulty, prerequisites, starterTopics, sequence };
}

function createMissionTasks(template: TrackTemplate, availableMinutes: number, carry: MissionTask[], previousTasks: MissionTask[]) {
  const count = availableMinutes < 20 ? 1 : availableMinutes < 40 ? 2 : availableMinutes < 60 ? 3 : availableMinutes < 90 ? 4 : 5;
  const completedTitles = new Set(previousTasks.filter((task) => task.status === "completed").map((task) => task.title));
  const taskTypes: MissionTaskType[] = ["learn", "learn", "practice", "assess", "prove"];
  const generated = template.starterTopics.map((topic, index) => ({
    title: topic, type: taskTypes[index], skill: template.sequence[0], topics: [topic, template.sequence[0]],
    priority: index < 2 ? 5 : index === 4 ? 4 : 3, completionCriteria: completionFor(taskTypes[index], topic),
    expectedOutcome: outcomeFor(taskTypes[index], topic), detail: detailFor(taskTypes[index], topic), carryForwardCount: 0,
  })).filter((task) => !completedTitles.has(task.title));
  const carried = carry.map((task) => ({ ...task, status: "pending" as const, carryForwardCount: task.carryForwardCount + 1, detail: `Carried forward because it remains important. ${task.detail}` }));
  const selected = [...carried, ...generated.filter((task) => !carried.some((item) => item.title === task.title))].slice(0, count);
  const durations = distributeMinutes(availableMinutes, selected.length);
  return selected.map((task, index) => ({ ...task, id: createUuid(), minutes: durations[index], scheduledFor: toDateInput(new Date()), status: "pending" as const }));
}

function fitDraftTasks(drafts: RoadmapDraft["tasks"], availableMinutes: number): MissionTask[] {
  const selected = drafts.slice(0, availableMinutes < 40 ? 2 : availableMinutes < 90 ? 4 : 6);
  const durations = distributeMinutes(availableMinutes, selected.length, selected.map((task) => task.minutes));
  return selected.map((task, index) => ({ id: createUuid(), title: task.title, detail: detailFor(task.type, task.title), minutes: durations[index], type: task.type, status: "pending", skill: task.skill, topics: task.topics, priority: task.priority, completionCriteria: task.completionCriteria, expectedOutcome: task.expectedOutcome, scheduledFor: toDateInput(new Date()), carryForwardCount: 0 }));
}

function createMilestones(template: TrackTemplate, durationWeeks: number, targetDate: string, skills: Skill[]) {
  const phaseCount = Math.min(template.sequence.length, Math.max(2, durationWeeks));
  const sequence = template.sequence.slice(0, phaseCount);
  const durations = distributeUnits(durationWeeks, phaseCount);
  let cursor = 1;
  return sequence.map((title, index) => {
    const startWeek = cursor;
    const endWeek = cursor + durations[index] - 1;
    cursor = endWeek + 1;
    const relatedSkills = index === 0 ? template.prerequisites.slice(0, 2) : [title];
    const progress = index === 0 && relatedSkills.length ? Math.round(relatedSkills.reduce((sum, name) => sum + (skills.find((skill) => skill.name === name)?.progress ?? 0), 0) / relatedSkills.length) : 0;
    return { id: createUuid(), title, detail: `Build working knowledge of ${title.toLowerCase()} and connect it directly to ${template.track}.`, startWeek, endWeek, dueDate: index === sequence.length - 1 ? targetDate : addDays(new Date(), endWeek * 7), status: index === 0 ? "active" as const : index < 3 ? "upcoming" as const : "locked" as const, progress, skills: relatedSkills.length ? relatedSkills : [title], completionCriteria: index === sequence.length - 1 ? ["Publish verified evidence", "Complete a role-specific interview review"] : ["Score at least 70% on a checkpoint", "Complete practice and save one evidence note"] };
  });
}

function parseAvailableMinutes(prompt: string, profile: Profile) {
  const weeklyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr)\s*(?:\/|a|per)\s*week\b/i);
  if (weeklyMatch) {
    const weeklyMinutes = weeklyMatch[2].toLowerCase().startsWith("h") ? Number(weeklyMatch[1]) * 60 : Number(weeklyMatch[1]);
    return Math.max(5, Math.min(240, Math.round(weeklyMinutes / 6)));
  }
  const dailyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr)\b(?:\s*(?:(?:a|per)\s*day|daily|today))?/i);
  if (dailyMatch) return Math.max(5, Math.min(240, Math.round(dailyMatch[2].toLowerCase().startsWith("h") ? Number(dailyMatch[1]) * 60 : Number(dailyMatch[1]))));
  return Math.max(30, Math.min(180, Math.round(profile.weekdayHours * 60 || 90)));
}

function parseWeeklyHours(prompt: string, profile: Profile) {
  const weeklyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr)\s*(?:\/|a|per)\s*week\b/i);
  if (weeklyMatch) {
    const hours = weeklyMatch[2].toLowerCase().startsWith("h") ? Number(weeklyMatch[1]) : Number(weeklyMatch[1]) / 60;
    return Math.max(0.5, Math.min(60, hours));
  }
  const dailyMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr)\s*(?:(?:a|per)\s*day|daily)\b/i);
  if (dailyMatch) {
    const hours = dailyMatch[2].toLowerCase().startsWith("h") ? Number(dailyMatch[1]) : Number(dailyMatch[1]) / 60;
    return Math.max(0.5, Math.min(60, hours * 6));
  }
  return profile.weekdayHours * 5 + profile.saturdayHours + profile.sundayHours;
}

type ExplicitDuration = { value: number; unit: "day" | "week" | "month" | "year"; weeks: number; label: string };

function parseExplicitDuration(prompt: string): ExplicitDuration | undefined {
  const contextual = prompt.match(/(?:in|within|for|over|next|have(?:\s+a)?(?:\s+time\s+limit\s+of)?|time\s+limit(?:\s+is|\s+of)?|deadline(?:\s+is|\s+of)?|duration(?:\s+is|\s+of)?|timeline(?:\s+is|\s+of)?)\s+(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)\b/i);
  const compact = prompt.match(/(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)\s+(?:roadmap|plan|timeline|deadline)\b/i);
  const match = contextual ?? compact;
  if (!match) return undefined;
  const value = Number(match[1]);
  const rawUnit = match[2].toLowerCase();
  const unit = rawUnit.startsWith("day") ? "day" : rawUnit.startsWith("week") ? "week" : rawUnit.startsWith("month") ? "month" : "year";
  const rawWeeks = unit === "day" ? Math.ceil(value / 7) : unit === "week" ? Math.ceil(value) : unit === "month" ? Math.ceil(value * 52 / 12) : Math.ceil(value * 52);
  const weeks = Math.max(1, Math.min(104, rawWeeks));
  return { value, unit, weeks, label: `${formatNumber(value)} ${unit}${value === 1 ? "" : "s"}` };
}

function parseDurationWeeks(profileTargetDate: string, previousWeeks?: number, explicitDuration?: ExplicitDuration) {
  if (explicitDuration) return explicitDuration.weeks;
  if (previousWeeks) return previousWeeks;
  if (profileTargetDate) {
    const difference = Math.ceil((new Date(profileTargetDate).getTime() - Date.now()) / 604_800_000);
    if (difference > 0) return Math.min(104, difference);
  }
  return 24;
}

function calculateTargetDate(prompt: string, profileTargetDate: string, durationWeeks: number, explicitDuration?: ExplicitDuration) {
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthIndex = months.findIndex((month) => prompt.includes(month));
  if (monthIndex >= 0) { const now = new Date(); return toDateInput(new Date(monthIndex <= now.getMonth() ? now.getFullYear() + 1 : now.getFullYear(), monthIndex, 1)); }
  if (explicitDuration) {
    if (explicitDuration.unit === "day") return addDays(new Date(), explicitDuration.value);
    if (explicitDuration.unit === "week") return addDays(new Date(), explicitDuration.value * 7);
    if (explicitDuration.unit === "month") return addMonths(new Date(), explicitDuration.value);
    return addMonths(new Date(), explicitDuration.value * 12);
  }
  if (profileTargetDate && new Date(profileTargetDate).getTime() > Date.now()) return profileTargetDate;
  return addDays(new Date(), durationWeeks * 7);
}

function goalLabel(prompt: string, trackName: string) {
  if (prompt.includes("internship")) return `${trackName} internship readiness`;
  if (prompt.includes("gate") && trackName !== "GATE + Placement") return `${trackName} + GATE preparation`;
  if (prompt.includes("gate")) return "GATE + placement readiness";
  if (prompt.includes("placement") || prompt.includes("job")) return `${trackName} placement readiness`;
  if (prompt.includes("project") || prompt.includes("build")) return `${trackName} project pathway`;
  return `${trackName} career readiness`;
}

function completionFor(type: MissionTaskType, topic: string) {
  if (type === "learn") return `Write a five-point explanation of ${topic}.`;
  if (type === "practice") return "Complete the planned problems and review every incorrect step.";
  if (type === "assess") return "Score at least 70%, then record weak concepts.";
  if (type === "build") return "Produce a working mini-output and document one test.";
  return "Save one evidence note with what changed and what needs revision.";
}

function outcomeFor(type: MissionTaskType, topic: string) {
  if (type === "learn") return `Explain ${topic} without copying notes.`;
  if (type === "practice") return "Solve the same pattern independently.";
  if (type === "assess") return "Know whether to advance or revise.";
  if (type === "build") return "Connect theory to a demonstrable output.";
  return "Create traceable proof of today’s progress.";
}

function detailFor(type: MissionTaskType, topic: string) {
  const actions = { learn: "Study the core idea and create concise notes for", practice: "Work through guided and independent questions on", assess: "Complete a focused checkpoint covering", build: "Create a small practical output for", prove: "Record evidence, limitations and next actions for" };
  return `${actions[type]} ${topic}.`;
}

function distributeMinutes(total: number, count: number, requested?: number[]) {
  if (count <= 0) return [];
  if (count === 1) return [total];
  const minimum = total >= count * 10 ? 10 : Math.max(1, Math.floor(total / count));
  const result = Array.from({ length: count }, () => minimum);
  let remaining = total - minimum * count;
  const weights = requested?.length === count ? requested : [24, 23, 21, 17, 15].slice(0, count);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  weights.forEach((weight, index) => { const addition = Math.floor(((remaining * weight) / weightTotal) / 5) * 5; result[index] += addition; });
  remaining = total - result.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remaining > 0; index += 1) { const addition = Math.min(5, remaining); result[index % count] += addition; remaining -= addition; }
  return result;
}

function distributeUnits(total: number, count: number) {
  const result = Array.from({ length: count }, () => 1);
  let remaining = Math.max(0, total - count);
  for (let index = 0; remaining > 0; index += 1) { result[index % count] += 1; remaining -= 1; }
  return result;
}

function allocationFor(trackName: string): RoadmapPlan["allocation"] {
  if (["Embedded Systems", "IoT", "PLC", "Industrial Automation", "Robotics"].includes(trackName)) return [{ label: "Learn", percent: 25 }, { label: "Practice", percent: 20 }, { label: "Build", percent: 40 }, { label: "Assess & Prove", percent: 15 }];
  if (["RF Engineering", "Radar Engineering", "Antenna Engineering", "Microwave Engineering", "Signal Processing", "Wireless Communication", "GATE + Placement"].includes(trackName)) return [{ label: "Learn", percent: 35 }, { label: "Practice", percent: 35 }, { label: "Build", percent: 15 }, { label: "Assess & Prove", percent: 15 }];
  return [{ label: "Learn", percent: 30 }, { label: "Practice", percent: 25 }, { label: "Build", percent: 30 }, { label: "Assess & Prove", percent: 15 }];
}

function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return toDateInput(next); }
function addMonths(date: Date, months: number) {
  const wholeMonths = Math.trunc(months);
  const partialDays = Math.round((months - wholeMonths) * 30.4375);
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + wholeMonths);
  next.setDate(Math.min(originalDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  if (partialDays) next.setDate(next.getDate() + partialDays);
  return toDateInput(next);
}
function formatDurationWeeks(weeks: number) { return weeks % 52 === 0 ? `${weeks / 52} ${weeks === 52 ? "year" : "years"}` : weeks >= 13 && weeks % 13 === 0 ? `${weeks / 13 * 3} months` : `${weeks} ${weeks === 1 ? "week" : "weeks"}`; }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1))); }
function toDateInput(date: Date) { return date.toISOString().slice(0, 10); }
function createUuid() { return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12)}`; }
