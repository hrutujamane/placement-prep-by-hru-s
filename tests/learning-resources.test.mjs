import assert from "node:assert/strict";
import test from "node:test";
import { getLearningResourcesForMilestone } from "../lib/learning-resources.ts";

const milestone = {
  id: "embedded-foundation",
  title: "C + digital foundation",
  detail: "Build the foundation.",
  startWeek: 1,
  endWeek: 4,
  dueDate: "2026-10-18",
  status: "active",
  progress: 0,
  skills: ["Embedded C"],
  completionCriteria: ["Complete a checkpoint"],
};

test("recommends one structured, one free-video and one optional paid resource", () => {
  const resources = getLearningResourcesForMilestone("Embedded Systems", milestone);
  assert.equal(resources.length, 3);
  assert.deepEqual(resources.map((resource) => resource.provider), ["NPTEL", "YouTube", "Udemy"]);
  assert.equal(resources[0].url, "https://www.nptel.ac.in/courses/106105159");
  assert.match(resources[1].url, /^https:\/\/www\.youtube\.com\/results\?search_query=/);
  assert.match(resources[2].url, /^https:\/\/www\.udemy\.com\/courses\/search\/\?q=/);
});

test("makes discovery links specific to the roadmap track and milestone", () => {
  const resources = getLearningResourcesForMilestone("Embedded Systems", milestone);
  const decodedYouTubeUrl = decodeURIComponent(resources[1].url);
  const decodedUdemyUrl = decodeURIComponent(resources[2].url);
  assert.match(decodedYouTubeUrl, /Embedded Systems C \+ digital foundation tutorial playlist/);
  assert.match(decodedUdemyUrl, /Embedded Systems C \+ digital foundation/);
});

test("covers every roadmap track with a direct NPTEL reference", () => {
  const tracks = [
    "Embedded Systems", "IoT", "RF Engineering", "Radar Engineering", "Antenna Engineering",
    "Microwave Engineering", "VLSI", "Semiconductor Engineering", "Signal Processing",
    "Telecommunication", "Wireless Communication", "Networking", "Industrial Automation", "PLC",
    "Robotics", "Core Electronics", "Software / IT", "AI + Electronics", "GATE + Placement",
  ];
  for (const track of tracks) {
    const [resource] = getLearningResourcesForMilestone(track, milestone);
    assert.match(resource.url, /^https:\/\/www\.nptel\.ac\.in\/courses\/\d+$/, track);
  }
});
