import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyzeResume } from "../lib/resume-review.ts";

const target = {
  company: "Example Electronics",
  role: "Embedded Systems Intern",
  jobDescription: "Seeking an intern with Embedded C, microcontrollers, CAN, UART, I2C, testing, debugging and GitHub documentation.",
};

test("compares a resume against the supplied company role without claiming an ATS result", () => {
  const review = analyzeResume({
    ...target,
    resumeText: "B.Tech ENTC student. Skills: Embedded C and UART. Project: Built a sensor logger and tested serial output.",
  });
  assert.ok(review.matchedKeywords.includes("embedded c"));
  assert.ok(review.matchedKeywords.includes("uart"));
  assert.ok(review.missingKeywords.includes("can"));
  assert.equal(review.analysisSource, "local");
  assert.ok(review.score >= 0 && review.score <= 100);
});

test("polished wording does not invent measurements", () => {
  const review = analyzeResume({
    ...target,
    resumeText: "Built an Arduino sensor logger using Embedded C. Tested the serial output and documented a limitation.",
  });
  assert.ok(review.polishedLines.length > 0);
  assert.doesNotMatch(review.polishedLines.join(" "), /\d+\s*(?:%|ms|hz|users?)/i);
  assert.ok(review.improvements.some((item) => /measured results only when documented/i.test(item.title)));
});

test("adding relevant sections and documented evidence improves the transparent score", () => {
  const draft = analyzeResume({ ...target, resumeText: "I like electronics and want an internship." });
  const improved = analyzeResume({
    ...target,
    resumeText: [
      "PROFILE Embedded Systems Intern focused on microcontrollers and Embedded C.",
      "CONTACT student@example.com · +91 9876543210 · https://github.com/student",
      "EDUCATION B.Tech ENTC, Example College",
      "SKILLS Embedded C, CAN, UART, I2C, microcontrollers, debugging",
      "PROJECTS Built a CAN and UART test application. Tested invalid inputs, documented results and limitations.",
    ].join("\n"),
  });
  assert.ok(improved.score > draft.score);
  assert.ok(improved.matchedKeywords.length > draft.matchedKeywords.length);
});

test("uses saved workspace facts only as student-confirmed suggestions", () => {
  const review = analyzeResume({
    ...target,
    resumeText: "B.Tech ENTC. Skills: Embedded C. Projects: Built a basic controller.",
    documentedFacts: ["ESP32 irrigation controller technologies: MQTT, I2C, sensors"],
  });
  assert.ok(review.suggestedSavedFacts.some((fact) => /I2C/i.test(fact)));
  assert.ok(review.improvements.some((item) => /confirming they are accurate and yours/i.test(item.detail)));
});

test("uses uploaded document structure when suggesting format improvements", () => {
  const review = analyzeResume({
    ...target,
    resumeText: "B.Tech ENTC student. Built an embedded controller and tested the output.",
    sourceFileName: "student-resume.pdf",
    documentFormat: { fileType: "pdf", pageCount: 3, headingCount: 0, bulletCount: 0, linkCount: 0, tableCount: 0, notes: ["3 PDF pages detected."] },
  });
  assert.equal(review.documentFormat?.pageCount, 3);
  assert.ok(review.improvements.some((item) => /resume length/i.test(item.title)));
  assert.ok(review.improvements.some((item) => /section hierarchy/i.test(item.title)));
});

test("implements bounded resume extraction and an explicit version tracker", async () => {
  const route = await readFile(new URL("../app/api/resume/extract/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../components/resume-page.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/202609210005_resume_tracker.sql", import.meta.url), "utf8");
  assert.match(route, /5 \* 1024 \* 1024/);
  assert.match(route, /pdf.*docx.*txt.*md/i);
  assert.match(route, /authenticateRequest/);
  assert.match(route, /documentFormat: analyzeDocumentFormat/);
  assert.match(route, /mammoth\.convertToHtml/);
  assert.match(route, /createWorker/);
  assert.match(route, /image\/png/);
  assert.match(page, /Save this review to tracker/i);
  assert.match(page, /wording is intentionally not displayed/i);
  assert.match(page, /\.png,.jpg,.jpeg,.webp/i);
  assert.doesNotMatch(page, /id="resume-text"/i);
  assert.match(page, /not a scan by the company’s real ATS/i);
  assert.match(page, /Uploading alone never creates a tracker record/i);
  assert.match(migration, /resume_versions/);
  assert.match(migration, /role_alignment_score/);
});
