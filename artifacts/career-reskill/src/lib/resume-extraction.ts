export type ExtractedResumeFields = {
  currentRole?: string;
  industry?: string;
  yearsExperience?: number;
  skills: string[];
};

const MAX_RESUME_BYTES = 15 * 1024 * 1024;
const MAX_SKILLS = 50;

const INDUSTRY_HINTS: Array<[string, RegExp]> = [
  ["Healthcare", /\b(?:healthcare|clinical|patient|nursing|medical|hospital|pharma|biomedical)\b/gi],
  ["Education", /\b(?:education|teaching|teacher|student|university|school|curriculum|learning)\b/gi],
  ["Financial services", /\b(?:banking|finance|financial|fintech|accounting|insurance|investment)\b/gi],
  ["Manufacturing", /\b(?:manufacturing|production|factory|industrial|quality control)\b/gi],
  ["Government", /\b(?:government|public sector|civil service|municipal)\b/gi],
  ["Retail", /\b(?:retail|e-commerce|ecommerce|merchandising|store operations)\b/gi],
  ["Energy", /\b(?:energy|renewable|solar|wind power|utilities|oil and gas)\b/gi],
  ["Technology", /\b(?:software|technology|IT\b|developer|programming|cybersecurity|artificial intelligence|machine learning|data science)\b/gi],
  ["Professional services", /\b(?:consulting|consultant|professional services|client advisory)\b/gi],
];

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function cleanLine(value: string): string {
  return value.replace(/^[\s•●▪◦*\-–—]+/, "").replace(/\s+/g, " ").trim();
}

function findLabeledValue(text: string, labels: string): string | undefined {
  const match = text.match(new RegExp(`^\\s*(?:${labels})\\s*[:：–—-]\\s*(.{2,100})$`, "im"));
  const value = match?.[1] ? cleanLine(match[1]) : "";
  return value || undefined;
}

function extractRole(text: string): string | undefined {
  const labeled = findLabeledValue(text, "(?:current\\s+)?(?:role|position|job\\s+title)");
  if (labeled) return labeled;

  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const experienceHeading = lines.findIndex((line) => /^(?:work\s+)?experience(?:\s+and\s+employment)?$/i.test(line.replace(/:$/, "")));
  if (experienceHeading < 0) return undefined;
  for (const line of lines.slice(experienceHeading + 1, experienceHeading + 5)) {
    if (/^(?:education|skills|projects|certifications?)\b/i.test(line)) break;
    if (/\b(?:19|20)\d{2}\b/.test(line) || line.length < 3) continue;
    const role = cleanLine(line.split(/\s+(?:at|@|[|])\s+/i)[0]).replace(/\s*[,(].*$/, "").trim();
    if (role && !/^(?:company|employer|location)\b/i.test(role)) return role.slice(0, 100);
  }
  return undefined;
}

function monthIndex(value: string, isEnd: boolean): number | undefined {
  const year = value.match(/\b(?:19|20)\d{2}\b/);
  if (!year) return undefined;
  const monthName = value.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i)?.[1]?.toLowerCase();
  const month = monthName ? MONTHS[monthName] : isEnd ? 11 : 0;
  return Number(year[0]) * 12 + month;
}

function deriveExperienceYears(text: string): number | undefined {
  const explicit = text.match(/\b(?:over|more than|about|approximately)?\s*(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:professional\s+)?experience\b/i)
    ?? text.match(/\bexperience\s*[:：-]\s*(\d{1,2})\s*(?:years?|yrs?)\b/i);
  if (explicit) return Math.min(40, Number(explicit[1]));

  const dateRanges = [...text.matchAll(/\b((?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+)?(?:19|20)\d{2}|present|current|now)\b/gi)];
  const now = new Date();
  const intervals = dateRanges.map((match) => {
    const start = monthIndex(match[1], false);
    const end = /^(?:present|current|now)$/i.test(match[2])
      ? now.getFullYear() * 12 + now.getMonth()
      : monthIndex(match[2], true);
    return start !== undefined && end !== undefined && end >= start ? [start, end] as const : null;
  }).filter((value): value is readonly [number, number] => value !== null)
    .sort((a, b) => a[0] - b[0]);
  if (!intervals.length) return undefined;

  let totalMonths = 0;
  let [start, end] = intervals[0];
  for (const [nextStart, nextEnd] of intervals.slice(1)) {
    if (nextStart <= end + 1) end = Math.max(end, nextEnd);
    else {
      totalMonths += end - start + 1;
      [start, end] = [nextStart, nextEnd];
    }
  }
  totalMonths += end - start + 1;
  return Math.min(40, Math.max(0, Math.round(totalMonths / 12)));
}

function extractSkills(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const heading = lines.findIndex((line) => /^(?:(?:technical\s+)?skills(?:\s*(?:&|and)\s*(?:tools|technologies))?|core competencies|areas of expertise)\s*:?\s*$/i.test(cleanLine(line)));
  if (heading < 0) return [];

  const collected: string[] = [];
  for (const line of lines.slice(heading + 1)) {
    const cleaned = cleanLine(line);
    if (!cleaned) {
      if (collected.length) break;
      continue;
    }
    if (/^(?:experience|employment|education|projects|certifications?|professional summary|work history|languages|interests)\b/i.test(cleaned)) break;
    collected.push(cleaned);
  }

  return [...new Set(collected
    .flatMap((line) => line.split(/[,;|•●▪◦]+/))
    .map(cleanLine)
    .filter((skill) => skill.length >= 2 && skill.length <= 70)
    .filter((skill) => !/^(?:skills?|technical skills|core competencies|areas of expertise)$/i.test(skill))
    .slice(0, MAX_SKILLS))];
}

function inferIndustry(text: string): string | undefined {
  const ranked = INDUSTRY_HINTS.map(([industry, pattern]) => ({
    industry,
    count: [...text.matchAll(pattern)].length,
  })).sort((a, b) => b.count - a.count);
  return ranked[0]?.count ? ranked[0].industry : undefined;
}

export function extractResumeFields(text: string): ExtractedResumeFields {
  const normalized = text.replace(/\u0000/g, " ").replace(/\r\n?/g, "\n");
  return {
    currentRole: extractRole(normalized),
    industry: findLabeledValue(normalized, "(?:target\\s+)?industry|sector") ?? inferIndustry(normalized),
    yearsExperience: deriveExperienceYears(normalized),
    skills: extractSkills(normalized),
  };
}

export async function readResumeFile(file: File): Promise<ExtractedResumeFields> {
  if (file.size > MAX_RESUME_BYTES) throw new Error("file-too-large");
  const extension = file.name.toLowerCase().split(".").pop();
  const buffer = await file.arrayBuffer();
  let text = "";

  if (extension === "txt") {
    text = new TextDecoder().decode(buffer);
  } else if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value;
  } else if (extension === "pdf") {
    const [pdfjs, pdfWorkerUrl] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl.default;
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const document = await loadingTask.promise;
    try {
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
      }
      text = pages.join("\n");
    } finally {
      await loadingTask.destroy();
    }
  } else {
    throw new Error("unsupported-file");
  }

  if (!text.trim()) throw new Error("no-readable-text");
  return extractResumeFields(text);
}
