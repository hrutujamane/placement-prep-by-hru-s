import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyOpportunity,
  greenhouseSources,
  isRelevantEngineeringOpportunity,
  mapGreenhouseJobs,
  matchOpportunityTagsForProfile,
  officialCareerPortals,
  rankOpportunitiesForProfile,
  scoreOpportunityForProfile,
  sortAndLimitOpportunities,
} from "../lib/job-opportunities.ts";

const source = greenhouseSources[0];

test("classifies early-career opportunities without calling every role an internship", () => {
  assert.equal(classifyOpportunity("Electrical Engineering Intern"), "Internship");
  assert.equal(classifyOpportunity("Graduate Apprentice - Electronics"), "Graduate / apprentice");
  assert.equal(classifyOpportunity("Senior Firmware Engineer"), "Job");
});

test("keeps early-career roles and domain-relevant engineering jobs", () => {
  assert.equal(isRelevantEngineeringOpportunity("Marketing Intern"), true);
  assert.equal(isRelevantEngineeringOpportunity("Embedded Firmware Engineer"), true);
  assert.equal(isRelevantEngineeringOpportunity("Office Manager"), false);
});

test("maps only validated HTTPS company or Greenhouse links", () => {
  const mapped = mapGreenhouseJobs(source, [
    { id: 1, title: "Electrical Engineering Intern", absolute_url: "https://job-boards.greenhouse.io/formlabsinternships/jobs/1", location: { name: "Somerville, MA" }, updated_at: "2026-09-20T10:00:00Z" },
    { id: 2, title: "Firmware Engineer", absolute_url: "https://careers.formlabs.com/jobs/2", location: { name: "Remote" } },
    { id: 3, title: "Hardware Engineer", absolute_url: "http://job-boards.greenhouse.io/formlabsinternships/jobs/3", location: { name: "Remote" } },
    { id: 4, title: "Embedded Engineer", absolute_url: "https://example.com/phishing", location: { name: "Remote" } },
  ]);

  assert.deepEqual(mapped.map((opportunity) => opportunity.id), ["greenhouse:formlabsinternships:1", "greenhouse:formlabsinternships:2"]);
  assert.equal(mapped[0].kind, "Internship");
  assert.ok(mapped[0].tags.includes("Hardware"));
});

test("prioritises internships and enforces the result limit", () => {
  const jobs = [
    { id: "job", company: "A", role: "Firmware Engineer", location: "India", kind: "Job", applyUrl: "https://a.test", sourceLabel: "A", sourceUrl: "https://a.test", tags: [], updatedAt: "2026-09-21T00:00:00Z" },
    { id: "intern", company: "B", role: "Hardware Intern", location: "India", kind: "Internship", applyUrl: "https://b.test", sourceLabel: "B", sourceUrl: "https://b.test", tags: [], updatedAt: "2026-09-20T00:00:00Z" },
  ];
  assert.deepEqual(sortAndLimitOpportunities(jobs, 1).map((job) => job.id), ["intern"]);
});

test("catalog links point only to HTTPS official career domains", () => {
  assert.ok(officialCareerPortals.length >= 5);
  for (const portal of officialCareerPortals) {
    const url = new URL(portal.url);
    assert.equal(url.protocol, "https:");
    assert.doesNotMatch(url.hostname, /linkedin|indeed|naukri/i);
  }
});

test("ranks a vacancy against saved target roles, skills and preferred companies", () => {
  const profile = { targetRoles: ["RF and Radar Engineer"], targetCompanies: ["Formlabs"], existingSkills: ["Embedded C"] };
  const opportunities = [
    { id: "software", company: "Other", role: "Frontend Software Engineer", location: "London", kind: "Job", applyUrl: "https://job-boards.greenhouse.io/other/jobs/1", sourceLabel: "Other", sourceUrl: "https://job-boards.greenhouse.io/other", tags: ["Software"] },
    { id: "rf", company: "Formlabs", role: "RF Embedded Engineering Intern", location: "Remote", kind: "Internship", applyUrl: "https://job-boards.greenhouse.io/formlabsinternships/jobs/2", sourceLabel: "Formlabs", sourceUrl: "https://job-boards.greenhouse.io/formlabsinternships", tags: ["RF / Wireless", "Embedded"] },
  ];
  assert.ok(scoreOpportunityForProfile(opportunities[1], profile) > scoreOpportunityForProfile(opportunities[0], profile));
  assert.equal(rankOpportunitiesForProfile(opportunities, profile)[0].id, "rf");
});

test("keeps unrelated internships behind openings in the student's engineering domain", () => {
  const profile = { targetRoles: ["RF and Radar Engineer"], targetCompanies: [], existingSkills: ["Basic electronics"] };
  const opportunities = [
    { id: "materials", company: "Formlabs", role: "PhD Intern - Materials Science", location: "Somerville, MA", kind: "Internship", applyUrl: "https://job-boards.greenhouse.io/formlabsinternships/jobs/1", sourceLabel: "Formlabs", sourceUrl: "https://job-boards.greenhouse.io/formlabsinternships", tags: [] },
    { id: "electrical", company: "Formlabs", role: "Electrical Engineering Intern", location: "Somerville, MA", kind: "Internship", applyUrl: "https://job-boards.greenhouse.io/formlabsinternships/jobs/2", sourceLabel: "Formlabs", sourceUrl: "https://job-boards.greenhouse.io/formlabsinternships", tags: ["Hardware"] },
    { id: "senior-wireless", company: "SpaceX", role: "Sr. IT Wireless Network Engineer", location: "Redmond, WA", kind: "Job", applyUrl: "https://job-boards.greenhouse.io/spacex/jobs/3", sourceLabel: "SpaceX", sourceUrl: "https://job-boards.greenhouse.io/spacex", tags: ["RF / Wireless", "Networking"] },
  ];
  assert.deepEqual(matchOpportunityTagsForProfile(opportunities[1], profile), ["Hardware"]);
  assert.equal(rankOpportunitiesForProfile(opportunities, profile)[0].id, "electrical");
});

test("API and UI preserve truthful notification and application boundaries", async () => {
  const routeSource = await readFile(new URL("../app/api/opportunities/route.ts", import.meta.url), "utf8");
  const uiSource = await readFile(new URL("../components/jobs-page.tsx", import.meta.url), "utf8");
  const alertSource = await readFile(new URL("../components/opportunity-alert.tsx", import.meta.url), "utf8");
  const shellSource = await readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
  assert.match(routeSource, /Promise\.allSettled/);
  assert.match(routeSource, /authenticateRequest/);
  assert.match(routeSource, /rateLimit/);
  assert.match(uiSource, /Notification\.requestPermission\(\)/);
  assert.match(uiSource, /while this application page is open/);
  assert.match(uiSource, /Opening an application link never changes its status automatically/);
  assert.match(uiSource, /noopener noreferrer/);
  assert.match(alertSource, /data-testid="vacancy-alert-popup"/);
  assert.match(alertSource, /placement-prep-vacancy-popup-seen-v1/);
  assert.match(alertSource, /Pause popups/);
  assert.match(alertSource, /status: "Interested"/);
  assert.match(shellSource, /<OpportunityAlert \/>/);
});
