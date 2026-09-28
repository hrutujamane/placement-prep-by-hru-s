"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, Bot, Check, CircuitBoard, Clock3, Code2, Compass, Cpu, HeartHandshake, PlayCircle, Radio, Sparkles, Wifi, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/components/app-provider";
import { Badge, Button, Label, PageHeader, Progress, Select, Textarea } from "@/components/ui";
import { explorationFitAdjustment, getExplorationActivityForTrack } from "@/lib/career-exploration";
import { careerTracks } from "@/lib/demo-data";

const interests = ["Circuits", "Hardware", "Coding", "Wireless technology", "Signals", "Chip design", "Automation", "Robotics", "Mathematics", "Hands-on work", "Communication systems", "Software"];
const iconMap = { Cpu, Radio, Wifi, CircuitBoard, Activity, Bot, Code2, Sparkles };

const trackGuidance: Record<string, {
  interests: string[];
  base: number;
  why: string;
  programming: string;
  difficulty: string;
  path: string;
  subjects: string;
  tools: string;
  project: string;
  opportunities: string;
}> = {
  "Embedded Systems": { interests: ["Circuits", "Hardware", "Coding", "Hands-on work", "Robotics"], base: 58, why: "Hardware + coding + hands-on", programming: "C / C++", difficulty: "Moderate", path: "5–8 months", subjects: "Digital electronics, C, microcontrollers and interfaces", tools: "Git, serial debugging, ESP32 or STM32 toolchains", project: "A sensor controller with safe failure handling", opportunities: "Firmware, embedded product and electronics teams" },
  IoT: { interests: ["Hardware", "Coding", "Wireless technology", "Hands-on work", "Software"], base: 58, why: "Connected hardware + systems", programming: "C++ / Python", difficulty: "Moderate", path: "5–8 months", subjects: "Embedded basics, sensors, networking and cloud telemetry", tools: "ESP32, MQTT, Git and a dashboard stack", project: "A tested monitoring or automation system", opportunities: "Connected products, industrial IoT and edge systems" },
  "RF Engineering": { interests: ["Wireless technology", "Signals", "Mathematics", "Communication systems", "Circuits"], base: 60, why: "Wireless + circuits + maths", programming: "Python / MATLAB", difficulty: "High foundation", path: "8–10 months", subjects: "Network theory, signals, communication, EM and transmission lines", tools: "Python, RF simulation, VNA and spectrum analyzer", project: "A link-budget or impedance-matching study", opportunities: "Wireless, aerospace, defence, telecom and RF test teams" },
  "Radar Engineering": { interests: ["Wireless technology", "Signals", "Mathematics", "Communication systems", "Hardware"], base: 62, why: "Wireless + signals + maths", programming: "Python / MATLAB", difficulty: "High foundation", path: "9–12 months", subjects: "Signals, communication, EM, RF, radar and estimation", tools: "Python, MATLAB or Octave, SDR and simulation tools", project: "A Doppler radar signal-processing simulation", opportunities: "Aerospace, defence, sensing and signal-processing teams" },
  "Antenna Engineering": { interests: ["Wireless technology", "Mathematics", "Circuits", "Hardware", "Hands-on work"], base: 57, why: "Wireless + fields + practical testing", programming: "Python / MATLAB", difficulty: "High foundation", path: "8–10 months", subjects: "EM theory, transmission lines, propagation and antennas", tools: "EM simulation, VNA and antenna measurement tools", project: "A simulated and measured antenna prototype", opportunities: "Wireless products, telecom, aerospace and antenna labs" },
  "Microwave Engineering": { interests: ["Wireless technology", "Mathematics", "Circuits", "Signals"], base: 58, why: "High-frequency circuits + maths", programming: "Python", difficulty: "High foundation", path: "8–10 months", subjects: "EM, transmission lines, S-parameters and microwave devices", tools: "RF simulation, Smith chart and VNA", project: "A transmission-line matching network study", opportunities: "RF components, test, aerospace and wireless hardware" },
  VLSI: { interests: ["Circuits", "Hardware", "Chip design", "Mathematics"], base: 56, why: "Circuits + chip design", programming: "Verilog / SystemVerilog", difficulty: "High foundation", path: "8–12 months", subjects: "Digital design, CMOS basics, timing and verification", tools: "HDL simulators, waveform viewers and Linux", project: "A verified RTL design with a testbench", opportunities: "Design, verification, physical design and semiconductor teams" },
  "Semiconductor Engineering": { interests: ["Circuits", "Hardware", "Chip design", "Mathematics", "Hands-on work"], base: 55, why: "Devices + chip technology", programming: "Python / scripting", difficulty: "High foundation", path: "8–12 months", subjects: "Semiconductor devices, fabrication, electronics and characterization", tools: "SPICE, data analysis and device-characterization tools", project: "A device-modeling or characterization study", opportunities: "Fabrication, process, product, validation and applications teams" },
  "Signal Processing": { interests: ["Signals", "Mathematics", "Communication systems", "Coding", "Software"], base: 58, why: "Signals + maths + coding", programming: "Python / MATLAB", difficulty: "High foundation", path: "7–10 months", subjects: "Signals, systems, probability, transforms and DSP", tools: "NumPy, SciPy, MATLAB or Octave", project: "A filtering, detection or audio analysis pipeline", opportunities: "Communications, sensing, audio, imaging and analytics" },
  Telecommunication: { interests: ["Communication systems", "Wireless technology", "Networking", "Signals"], base: 55, why: "Communication systems + networks", programming: "Python basics", difficulty: "Moderate", path: "6–8 months", subjects: "Communication, transmission, switching and network fundamentals", tools: "Network simulators, spectrum tools and Linux", project: "A simulated communication-network performance study", opportunities: "Telecom operations, planning, optimization and support" },
  "Wireless Communication": { interests: ["Wireless technology", "Communication systems", "Signals", "Mathematics"], base: 59, why: "Wireless + modulation + signals", programming: "Python / MATLAB", difficulty: "High foundation", path: "7–10 months", subjects: "Signals, modulation, noise, channels and link budgets", tools: "SDR, GNU Radio and numerical simulation", project: "A modulation and channel-performance simulator", opportunities: "Wireless systems, modem, telecom and connectivity teams" },
  Networking: { interests: ["Software", "Coding", "Communication systems", "Wireless technology"], base: 53, why: "Protocols + connected systems", programming: "Python basics", difficulty: "Moderate", path: "4–7 months", subjects: "Computer networks, TCP/IP, routing, security and Linux", tools: "Wireshark, Linux and network simulators", project: "A monitored and documented small network lab", opportunities: "Network engineering, operations, support and security" },
  "Industrial Automation": { interests: ["Automation", "Robotics", "Hardware", "Hands-on work", "Circuits"], base: 56, why: "Automation + practical systems", programming: "PLC / C basics", difficulty: "Moderate", path: "5–8 months", subjects: "Control systems, sensors, motors and industrial protocols", tools: "PLC simulators, ladder logic and HMI tools", project: "A simulated production-cell sequence with interlocks", opportunities: "Manufacturing, controls, maintenance and systems integration" },
  PLC: { interests: ["Automation", "Hardware", "Hands-on work", "Circuits"], base: 54, why: "Logic + industrial control", programming: "Ladder logic / Structured Text", difficulty: "Moderate", path: "4–6 months", subjects: "Digital logic, sensors, actuators, control and safety", tools: "PLC IDE, simulator, HMI and SCADA", project: "A safe tank-control sequence with alarms and interlocks", opportunities: "PLC programming, commissioning, maintenance and integration" },
  Robotics: { interests: ["Robotics", "Automation", "Coding", "Hardware", "Mathematics"], base: 57, why: "Coding + control + hardware", programming: "C++ / Python", difficulty: "Moderate–High", path: "7–10 months", subjects: "Control, embedded systems, sensors, kinematics and planning", tools: "ROS, simulation, Git and embedded platforms", project: "A simulated or physical sensing-and-control robot", opportunities: "Robotics, automation, autonomy and integration teams" },
  "Core Electronics": { interests: ["Circuits", "Hardware", "Hands-on work", "Mathematics"], base: 56, why: "Circuits + physical systems", programming: "C basics", difficulty: "Moderate", path: "6–9 months", subjects: "Analog, digital, power, measurements and PCB fundamentals", tools: "Oscilloscope, multimeter, SPICE and PCB tools", project: "A tested analog or mixed-signal circuit", opportunities: "Electronics design, validation, test and product engineering" },
  "Software / IT": { interests: ["Coding", "Software", "Mathematics"], base: 54, why: "Coding + analytical work", programming: "One primary language", difficulty: "Moderate", path: "5–9 months", subjects: "Programming, DSA, databases, networking and development", tools: "Git, an IDE, testing and deployment tools", project: "A deployed application with tests and documentation", opportunities: "Software engineering, QA, data and platform roles" },
  "AI + Electronics": { interests: ["Coding", "Software", "Signals", "Hardware", "Robotics"], base: 55, why: "Coding + intelligent hardware", programming: "Python / C++", difficulty: "High foundation", path: "8–12 months", subjects: "Signals, embedded systems, ML basics and data", tools: "Python, model runtimes and edge hardware", project: "An edge classification prototype with measured limits", opportunities: "Edge AI, intelligent sensing, robotics and applied ML" },
};

export function CareerDiscoveryPage() {
  const { state, recordCareerExploration } = useApp();
  const [selected, setSelected] = useState<string[]>(["Wireless technology", "Signals", "Mathematics", "Hardware"]);
  const [revealed, setRevealed] = useState(true);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);
  const [activityTrack, setActivityTrack] = useState<string | null>(null);
  const [enjoyed, setEnjoyed] = useState<"yes" | "unsure" | "no">("yes");
  const [interestingPart, setInterestingPart] = useState("");
  const [difficultPart, setDifficultPart] = useState("");
  const [wantsAnother, setWantsAnother] = useState(true);
  const [outputNote, setOutputNote] = useState("");
  const ranked = useMemo(() => careerTracks.map((track) => {
    const guidance = trackGuidance[track.name];
    const overlap = selected.filter((interest) => guidance.interests.includes(interest)).length;
    const explorationAdjustment = explorationFitAdjustment(track.name, state.roleExplorationAttempts);
    return { ...track, guidance, match: Math.max(20, Math.min(96, guidance.base + overlap * 8 + explorationAdjustment)) };
  }).sort((first, second) => second.match - first.match), [selected, state.roleExplorationAttempts]);
  const activeActivity = activityTrack ? getExplorationActivityForTrack(activityTrack) : null;

  function toggle(interest: string) {
    setSelected((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
    setRevealed(false);
  }

  function saveExploration() {
    if (!activeActivity || !outputNote.trim()) return;
    recordCareerExploration({ activityId: activeActivity.id, track: activeActivity.track, enjoyed, interestingPart: interestingPart.trim(), difficultPart: difficultPart.trim(), wantsAnother, outputNote: outputNote.trim() });
    setActivityTrack(null); setInterestingPart(""); setDifficultPart(""); setOutputNote(""); setEnjoyed("yes"); setWantsAnother(true);
  }

  return <AppShell>
    <PageHeader eyebrow="Career discovery" title="You don’t need the perfect answer yet." description="Explore role families based on what you enjoy. This is transparent guidance—not a scientifically validated personality assessment." />
    <section className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-[var(--brand)]"><Compass className="size-5" /></div><div><h2 className="font-bold">What sounds interesting?</h2><p className="text-sm text-[var(--muted)]">Choose as many as you like.</p></div></div>
        <div className="mt-6 flex flex-wrap gap-2">{interests.map((interest) => <button key={interest} aria-pressed={selected.includes(interest)} onClick={() => toggle(interest)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selected.includes(interest) ? "border-[var(--brand)] bg-violet-500/10 text-[var(--brand-strong)]" : "border-[var(--line)] hover:border-violet-500/40"}`}>{interest}</button>)}</div>
        <Button className="mt-7 w-full" onClick={() => setRevealed(true)} disabled={selected.length < 2}>Show suitable career paths <Sparkles className="size-4" /></Button>
        <div className="mt-5 rounded-2xl border border-[var(--line)] bg-slate-500/5 p-4 text-xs leading-5 text-[var(--muted)]"><HeartHandshake className="mb-2 size-4 text-[var(--brand)]" />You can try a foundation lesson or starter project before choosing a track. Exploration does not lock your roadmap.</div>
      </div>

      <div>{revealed ? <div className="space-y-4"><p className="text-xs font-medium text-[var(--muted)]">Showing your top 5 matches from 18 initial career tracks.</p>{ranked.slice(0, 5).map((track, index) => {
        const Icon = iconMap[track.icon as keyof typeof iconMap] ?? Sparkles;
        const expanded = expandedTrack === track.name;
        return <article key={track.name} className={`card p-5 transition ${index === 0 ? "border-violet-500/35" : ""}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${index === 0 ? "bg-[var(--brand)] text-white" : "bg-violet-500/10 text-[var(--brand)]"}`}><Icon className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{track.name}</h3>{index === 0 && <Badge tone="brand">Best current fit</Badge>}</div><p className="mt-1 text-sm text-[var(--muted)]">{track.detail}</p></div><div className="min-w-32"><div className="mb-1.5 flex items-center justify-between text-xs"><span>Fit signal</span><strong>{track.match}%</strong></div><Progress value={track.match} /></div></div>
          {index < 3 && <div className="mt-5 grid gap-3 border-t border-[var(--line)] pt-4 text-xs sm:grid-cols-4"><Info label="Why it matches" value={track.guidance.why} /><Info label="Programming" value={track.guidance.programming} /><Info label="Difficulty" value={track.guidance.difficulty} /><Info label="Starter path" value={track.guidance.path} /></div>}
          {expanded && <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-slate-500/5 p-4 text-xs sm:grid-cols-2"><Info label="Required subjects" value={track.guidance.subjects} /><Info label="Common tools" value={track.guidance.tools} /><Info label="Starter project" value={track.guidance.project} /><Info label="Career opportunities" value={track.guidance.opportunities} /></div>}
          <div className="mt-4 flex flex-wrap justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setActivityTrack(track.name)}><PlayCircle className="size-4" />Try this career</Button><Button size="sm" variant="ghost" aria-expanded={expanded} onClick={() => setExpandedTrack(expanded ? null : track.name)}>{expanded ? "Hide role details" : "Explore this role"} <ArrowRight className="size-4" /></Button></div>
        </article>;
      })}</div> : <div className="card grid min-h-[520px] place-items-center p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-violet-500/10 text-[var(--brand)]"><Compass className="size-8" /></div><h2 className="mt-5 text-xl font-bold">Ready when you are</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Select at least two interests, then generate a transparent set of career paths to explore.</p></div></div>}</div>
    </section>
    {activeActivity && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><div className="mx-auto my-4 max-w-4xl rounded-[1.6rem] border border-[var(--line)] bg-[var(--background)] shadow-2xl"><header className="flex items-start justify-between border-b border-[var(--line)] p-5 sm:p-6"><div><Badge tone="brand">Try this career · exploratory activity</Badge><h2 className="mt-3 text-2xl font-bold">{activeActivity.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{activeActivity.represents}</p></div><button onClick={() => setActivityTrack(null)} className="rounded-xl border border-[var(--line)] p-2" aria-label="Close activity"><X className="size-5" /></button></header><div className="p-5 sm:p-7"><div className="grid gap-5 lg:grid-cols-2"><ActivityPanel title="Before you start" items={[`Time: ${activeActivity.estimatedMinutes} minutes`, ...activeActivity.prerequisites.map((item) => `Prerequisite: ${item}`), ...activeActivity.requiredTools.map((item) => `Tool: ${item}`)]} /><ActivityPanel title="Instructions" items={activeActivity.instructions} /><ActivityPanel title="Expected output" items={[activeActivity.expectedOutput]} /><ActivityPanel title="Beginner support" items={activeActivity.beginnerSupport} /></div><div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/7 p-4 text-xs leading-5 text-[var(--muted)]">This is an exploratory learning experience, not a personality test or a definitive career assessment. One weak attempt will never exclude a field.</div><div className="mt-6 border-t border-[var(--line)] pt-6"><h3 className="font-bold">Save your reflection</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><Label>Did you enjoy this?</Label><Select value={enjoyed} onChange={(event) => setEnjoyed(event.target.value as typeof enjoyed)}><option value="yes">Yes</option><option value="unsure">Unsure</option><option value="no">No</option></Select></div><div><Label>Would you like another activity?</Label><Select value={wantsAnother ? "yes" : "no"} onChange={(event) => setWantsAnother(event.target.value === "yes")}><option value="yes">Yes</option><option value="no">Not now</option></Select></div><div><Label>Which part interested you?</Label><Textarea value={interestingPart} onChange={(event) => setInterestingPart(event.target.value)} /></div><div><Label>Which part was difficult?</Label><Textarea value={difficultPart} onChange={(event) => setDifficultPart(event.target.value)} /></div></div><div className="mt-4"><Label>What output did you produce?</Label><Textarea value={outputNote} onChange={(event) => setOutputNote(event.target.value)} required placeholder={activeActivity.expectedOutput} /></div><Button className="mt-5 w-full" onClick={saveExploration} disabled={!outputNote.trim()}><Check className="size-4" />Save exploration and refine suggestions</Button></div></div></div></div>}
  </AppShell>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function ActivityPanel({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-[var(--line)] p-5"><h3 className="flex items-center gap-2 font-bold"><Clock3 className="size-4 text-[var(--brand)]" />{title}</h3><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="text-sm leading-6 text-[var(--muted)]">• {item}</li>)}</ul></div>;
}
