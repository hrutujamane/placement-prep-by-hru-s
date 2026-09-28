import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createWorker, OEM } from "tesseract.js";
import englishData from "@tesseract.js-data/eng";
import { getRequestIdentifier, rateLimit } from "@/lib/server/rate-limit";
import { authenticateRequest } from "@/lib/supabase/server-auth";
import type { ResumeDocumentFormat } from "@/lib/types";

export const runtime = "nodejs";

const maximumBytes = 5 * 1024 * 1024;
const maximumCharacters = 50_000;
const allowedExtensions = new Set(["pdf", "docx", "txt", "md", "png", "jpg", "jpeg", "webp"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/octet-stream",
  "",
]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "webp"]);
let activeOcrRequests = 0;

export async function POST(request: Request) {
  const identifier = getRequestIdentifier(request);
  const limit = rateLimit(`resume-extract:${identifier}`, 12, 60_000);
  if (!limit.allowed) return Response.json({ error: "Too many uploads. Please wait before retrying." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const user = await authenticateRequest(request);
  if (!user) return Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 });

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return Response.json({ error: "The uploaded file could not be read." }, { status: 400 }); }

  const upload = formData.get("resume");
  if (!(upload instanceof File)) return Response.json({ error: "Choose a resume file to continue." }, { status: 400 });
  if (upload.size === 0) return Response.json({ error: "The selected file is empty." }, { status: 400 });
  if (upload.size > maximumBytes) return Response.json({ error: "Resume files must be 5 MB or smaller." }, { status: 413 });

  const extension = upload.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(upload.type.toLowerCase())) {
    return Response.json({ error: "Use a PDF, DOCX, PNG, JPG or WebP resume file." }, { status: 415 });
  }

  try {
    const buffer = Buffer.from(await upload.arrayBuffer());
    const warnings: string[] = [];
    let text = "";
    let pageCount: number | undefined;
    let documentHtml = "";
    let ocrConfidence: number | undefined;

    if (extension === "pdf") {
      if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") return Response.json({ error: "This file does not appear to be a valid PDF." }, { status: 415 });
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text;
        pageCount = result.total;
      } finally {
        await parser.destroy();
      }
      if (text.trim().length < 80) warnings.push("This PDF may be scanned or image-based. Upload a text-based PDF or DOCX if important content cannot be read.");
    } else if (extension === "docx") {
      if (buffer.subarray(0, 2).toString("ascii") !== "PK") return Response.json({ error: "This file does not appear to be a valid DOCX document." }, { status: 415 });
      const [rawResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }, { externalFileAccess: false }),
      ]);
      text = rawResult.value;
      documentHtml = htmlResult.value;
      warnings.push(...[...rawResult.messages, ...htmlResult.messages].filter((message) => message.type === "warning").map((message) => message.message).slice(0, 3));
    } else if (imageExtensions.has(extension)) {
      if (!hasValidImageSignature(buffer, extension)) return Response.json({ error: "This file does not appear to be a valid resume image." }, { status: 415 });
      if (activeOcrRequests >= 1) return Response.json({ error: "The image reader is busy. Please retry in a moment." }, { status: 503 });
      activeOcrRequests += 1;
      let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
      try {
        worker = await createWorker(englishData.code, OEM.LSTM_ONLY, {
          langPath: englishData.langPath,
          gzip: englishData.gzip,
          cacheMethod: "none",
        });
        const result = await worker.recognize(buffer, { rotateAuto: true });
        text = result.data.text;
        ocrConfidence = Math.round(result.data.confidence);
        if (ocrConfidence < 65) warnings.push("Some image text was unclear. Use a sharper, straight, well-lit image and verify all suggestions against the original resume.");
      } finally {
        await worker?.terminate();
        activeOcrRequests = Math.max(0, activeOcrRequests - 1);
      }
    } else {
      text = buffer.toString("utf8");
    }

    text = normalizeExtractedText(text);
    if (text.length < 30) return Response.json({ error: imageExtensions.has(extension) ? "Not enough resume text could be recognized. Try a sharper, straight, well-lit image." : "Very little readable text was found. Upload a text-based PDF or DOCX resume." }, { status: 422 });
    if (text.length > maximumCharacters) {
      text = text.slice(0, maximumCharacters);
      warnings.push("Only the first 50,000 characters were analyzed.");
    }

    return Response.json({
      text,
      fileName: safeFileName(upload.name),
      fileType: extension,
      characters: text.length,
      documentFormat: analyzeDocumentFormat(extension, text, documentHtml, pageCount, ocrConfidence),
      warnings,
    }, { headers: { "X-RateLimit-Remaining": String(limit.remaining) } });
  } catch (error) {
    console.error("Resume file reading failed", { extension, message: error instanceof Error ? error.message : "unknown error" });
    return Response.json({ error: imageExtensions.has(extension) ? "The resume image could not be read. Try a sharper PNG, JPG or WebP image." : "The resume could not be read in this format. Try a text-based PDF or DOCX file." }, { status: 422 });
  }
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
}

function analyzeDocumentFormat(extension: string, text: string, html: string, pageCount?: number, ocrConfidence?: number): ResumeDocumentFormat {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const structuralHeadings = new Set(lines.filter((line) => line.length <= 45 && (/^(summary|profile|objective|education|skills|technical skills|projects?|experience|internships?|certifications?|achievements?|positions?|activities)$/i.test(line) || (/^[A-Z][A-Z &/+-]{2,}$/.test(line) && line.split(/\s+/).length <= 5))));
  const htmlHeadingCount = (html.match(/<h[1-6][\s>]/gi) ?? []).length;
  const htmlBulletCount = (html.match(/<li[\s>]/gi) ?? []).length;
  const textBulletCount = lines.filter((line) => /^[•●▪◦*-]\s+/.test(line)).length;
  const linkCount = Math.max((html.match(/<a[\s>]/gi) ?? []).length, (text.match(/https?:\/\/|github\.com|linkedin\.com/gi) ?? []).length);
  const tableCount = (html.match(/<table[\s>]/gi) ?? []).length;
  const headingCount = Math.max(htmlHeadingCount, structuralHeadings.size);
  const bulletCount = Math.max(htmlBulletCount, textBulletCount);
  const notes: string[] = [];
  if (pageCount) notes.push(`${pageCount} PDF page${pageCount === 1 ? "" : "s"} detected.`);
  notes.push(`${headingCount} section heading${headingCount === 1 ? "" : "s"}, ${bulletCount} bullet${bulletCount === 1 ? "" : "s"}, and ${linkCount} visible link${linkCount === 1 ? "" : "s"} detected.`);
  if (extension === "docx") notes.push("DOCX headings, lists, links and table structure were read from the uploaded document.");
  if (extension === "pdf") notes.push("PDF page count and visible text structure were read; exact font, spacing and visual balance still need a human visual check.");
  if (imageExtensions.has(extension)) notes.push(`English OCR read the image${ocrConfidence === undefined ? "" : ` with ${ocrConfidence}% recognition confidence`}; verify names, numbers and links against the original.`);
  return { fileType: extension as ResumeDocumentFormat["fileType"], pageCount, ocrConfidence, headingCount, bulletCount, linkCount, tableCount, notes };
}

function hasValidImageSignature(buffer: Buffer, extension: string) {
  if (extension === "png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (extension === "jpg" || extension === "jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === "webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}
