import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { PoolClient } from "pg";
import type { DraftStudyLesson } from "../src/contentImport";
import type { DraftQuestion } from "../src/importQuestions";
import type { SubjectCode } from "../src/subjects";

type ImportedFileReport = {
  file: string;
  subject?: SubjectCode;
  questions: number;
  lessons: number;
  skipped: boolean;
  reason?: string;
};

type DbModule = typeof import("../src/db");
type IdentityModule = typeof import("../src/questionIdentity");
type ContentImportModule = typeof import("../src/contentImport");

const supportedExtensions = new Set([".pdf", ".docx", ".txt", ".md", ".csv"]);
const backendDir = findBackendDir();
const rootDir = path.resolve(backendDir, "..");

let db: DbModule;
let identity: IdentityModule;
let contentImport: ContentImportModule;

void main().catch(async (error) => {
  console.error(error);
  await db?.pool.end().catch(() => undefined);
  process.exitCode = 1;
});

async function main() {
  await loadEnv(path.join(backendDir, ".env"));

  db = (await import("../src/db")) as DbModule;
  identity = (await import("../src/questionIdentity")) as IdentityModule;
  contentImport = (await import("../src/contentImport")) as ContentImportModule;

  const sourceArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const sourceRoot = path.resolve(sourceArg ?? path.join(rootDir, "ÔN THI TỐT NGHIỆP"));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--preview") || process.env.DRY_RUN === "true";
  const reportPath = path.join(rootDir, "artifacts", `import-graduation-report${dryRun ? "-dry-run" : ""}.json`);

  await db.ensureDatabase();

  const adminId = await getAdminId();
  const files = await listFiles(sourceRoot);
  const lessonFingerprints = await getExistingLessonFingerprints();
  const report: ImportedFileReport[] = [];
  const totals = {
    scannedFiles: 0,
    skippedFiles: 0,
    importedQuestions: 0,
    importedLessons: 0,
    duplicateQuestions: 0,
    duplicateLessons: 0,
    reviewQuestions: 0
  };

  for (const filePath of files) {
    const relativePath = path.relative(sourceRoot, filePath);
    const extension = path.extname(filePath).toLowerCase();
    totals.scannedFiles += 1;

    if (!supportedExtensions.has(extension)) {
      totals.skippedFiles += 1;
      report.push({
        file: relativePath,
        questions: 0,
        lessons: 0,
        skipped: true,
        reason: `Chưa hỗ trợ đọc ${extension || "file không có phần mở rộng"} trong script import`
      });
      continue;
    }

    const subject = subjectFromPath(relativePath);

    try {
      const text = await extractText(filePath, extension);
      const review = await contentImport.parseAndReviewImportedContent(text, subject, relativePath);
      const inserted = dryRun
        ? await previewInsertions(subject, review.questions, review.lessons, lessonFingerprints)
        : await insertReviewedContent(subject, review.questions, review.lessons, adminId, lessonFingerprints);

      totals.importedQuestions += inserted.questions;
      totals.importedLessons += inserted.lessons;
      totals.duplicateQuestions += inserted.duplicateQuestions;
      totals.duplicateLessons += inserted.duplicateLessons;
      totals.reviewQuestions += inserted.reviewQuestions;

      report.push({
        file: relativePath,
        subject,
        questions: inserted.questions,
        lessons: inserted.lessons,
        skipped: inserted.questions === 0 && inserted.lessons === 0,
        reason: inserted.questions === 0 && inserted.lessons === 0 ? "Không có nội dung mới sau khi lọc trùng/phân loại" : undefined
      });
    } catch (error) {
      totals.skippedFiles += 1;
      report.push({
        file: relativePath,
        subject,
        questions: 0,
        lessons: 0,
        skipped: true,
        reason: error instanceof Error ? error.message : "Không đọc được file"
      });
    }
  }

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        sourceRoot,
        dryRun,
        totals,
        files: report
      },
      null,
      2
    ),
    "utf8"
  );

  await db.pool.end();

  console.log(
    JSON.stringify(
      {
        dryRun,
        sourceRoot,
        reportPath,
        totals
      },
      null,
      2
    )
  );
}

async function insertReviewedContent(
  subject: SubjectCode,
  questions: DraftQuestion[],
  lessons: DraftStudyLesson[],
  adminId: string | null,
  lessonFingerprints: Map<SubjectCode, Set<string>>
) {
  return db.withTransaction(async (client) => {
    const existingQuestions = await getQuestionFingerprints(client, subject);
    let insertedQuestions = 0;
    let insertedLessons = 0;
    let duplicateQuestions = 0;
    let duplicateLessons = 0;
    let reviewQuestions = 0;

    for (const question of questions) {
      const fingerprint = identity.questionFingerprint(question.content);

      if (existingQuestions.has(fingerprint)) {
        duplicateQuestions += 1;
        continue;
      }

      const options = question.options.filter((option) => option.content.trim()).slice(0, 6);
      const isPublishable = isQuestionPublishable(options);
      const inserted = await client.query<{ id: number }>(
        `
          INSERT INTO questions (subject, content, explanation, is_active, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [subject, question.content, question.explanation.trim() || null, Boolean(question.isActive && isPublishable), adminId]
      );

      for (const [index, option] of options.entries()) {
        await client.query(
          `
            INSERT INTO options (question_id, label, content, is_correct)
            VALUES ($1, $2, $3, $4)
          `,
          [inserted.rows[0].id, String.fromCharCode(65 + index), option.content, option.isCorrect]
        );
      }

      existingQuestions.add(fingerprint);
      insertedQuestions += 1;

      if (!isPublishable) {
        reviewQuestions += 1;
      }
    }

    for (const lesson of lessons) {
      const fingerprint = lessonFingerprint(lesson.title, lesson.content);
      const subjectLessons = lessonFingerprints.get(subject) ?? new Set<string>();

      if (subjectLessons.has(fingerprint)) {
        duplicateLessons += 1;
        continue;
      }

      await client.query(
        `
          INSERT INTO study_lessons (subject, title, summary, content, is_active, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [subject, lesson.title, lesson.summary, lesson.content, lesson.isActive, adminId]
      );

      subjectLessons.add(fingerprint);
      lessonFingerprints.set(subject, subjectLessons);
      insertedLessons += 1;
    }

    return {
      questions: insertedQuestions,
      lessons: insertedLessons,
      duplicateQuestions,
      duplicateLessons,
      reviewQuestions
    };
  });
}

async function previewInsertions(
  subject: SubjectCode,
  questions: DraftQuestion[],
  lessons: DraftStudyLesson[],
  lessonFingerprints: Map<SubjectCode, Set<string>>
) {
  const existingQuestions = await getQuestionFingerprints(undefined, subject);
  let duplicateQuestions = 0;
  let duplicateLessons = 0;
  let reviewQuestions = 0;
  let newQuestions = 0;
  let newLessons = 0;

  for (const question of questions) {
    const fingerprint = identity.questionFingerprint(question.content);

    if (existingQuestions.has(fingerprint)) {
      duplicateQuestions += 1;
      continue;
    }

    existingQuestions.add(fingerprint);
    newQuestions += 1;

    if (!isQuestionPublishable(question.options)) {
      reviewQuestions += 1;
    }
  }

  for (const lesson of lessons) {
    const fingerprint = lessonFingerprint(lesson.title, lesson.content);
    const subjectLessons = lessonFingerprints.get(subject) ?? new Set<string>();

    if (subjectLessons.has(fingerprint)) {
      duplicateLessons += 1;
      continue;
    }

    subjectLessons.add(fingerprint);
    lessonFingerprints.set(subject, subjectLessons);
    newLessons += 1;
  }

  return {
    questions: newQuestions,
    lessons: newLessons,
    duplicateQuestions,
    duplicateLessons,
    reviewQuestions
  };
}

async function getQuestionFingerprints(client: PoolClient | undefined, subject: SubjectCode) {
  const executor = client ?? db.pool;
  const result = await executor.query<{ content: string }>("SELECT content FROM questions WHERE subject = $1", [subject]);
  return new Set(result.rows.map((question) => identity.questionFingerprint(question.content)));
}

async function getExistingLessonFingerprints() {
  const result = await db.pool.query<{ subject: SubjectCode; title: string; content: string }>(
    "SELECT subject, title, content FROM study_lessons"
  );
  const fingerprints = new Map<SubjectCode, Set<string>>();

  for (const lesson of result.rows) {
    const subjectLessons = fingerprints.get(lesson.subject) ?? new Set<string>();
    subjectLessons.add(lessonFingerprint(lesson.title, lesson.content));
    fingerprints.set(lesson.subject, subjectLessons);
  }

  return fingerprints;
}

async function getAdminId() {
  const result = await db.pool.query<{ id: string }>("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1");
  return result.rows[0]?.id ?? null;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[][] = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }

      return entry.isFile() ? [fullPath] : [];
    })
  );

  return files.flat().sort((first: string, second: string) => first.localeCompare(second, "vi"));
}

async function extractText(filePath: string, extension: string) {
  const buffer = await fs.readFile(filePath);

  if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return normalizeText(result.text ?? "");
    } finally {
      await parser.destroy();
    }
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value);
  }

  return normalizeText(buffer.toString("utf8"));
}

function subjectFromPath(value: string): SubjectCode {
  const normalized = stripDiacritics(value).toLowerCase();

  if (/\bsknn\b|nghe nghiep|benh nghe|lao nn|\bbnn\b/.test(normalized)) {
    return "suc_khoe_nghe_nghiep";
  }

  if (/\bskmt\b|moi truong|ve sinh|onmt|nuoc sach|chat thai/.test(normalized)) {
    return "suc_khoe_moi_truong";
  }

  if (/dinh duong|\bdd\b|attp|vsattp|khau phan|thuc pham/.test(normalized)) {
    return "dinh_duong";
  }

  return "dich_te";
}

function lessonFingerprint(title: string, content: string) {
  return stripDiacritics(`${title} ${content}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 4000);
}

function isQuestionPublishable(options: Array<{ content: string; isCorrect: boolean }>) {
  const filledOptions = options.filter((option) => option.content.trim());
  return filledOptions.length >= 2 && filledOptions.filter((option) => option.isCorrect).length === 1;
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/-\n(?=\p{L})/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function findBackendDir() {
  const cwd = process.cwd();

  if (fsSync.existsSync(path.join(cwd, "package.json")) && fsSync.existsSync(path.join(cwd, "src", "db.ts"))) {
    return cwd;
  }

  const nestedBackend = path.join(cwd, "backend");

  if (
    fsSync.existsSync(path.join(nestedBackend, "package.json")) &&
    fsSync.existsSync(path.join(nestedBackend, "src", "db.ts"))
  ) {
    return nestedBackend;
  }

  return cwd;
}

function loadEnv(filePath: string) {
  return fs
    .readFile(filePath, "utf8")
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }

        const separator = trimmed.indexOf("=");

        if (separator <= 0) {
          continue;
        }

        const key = trimmed.slice(0, separator).trim();
        const rawValue = trimmed.slice(separator + 1).trim();
        const value = rawValue.replace(/^["']|["']$/g, "");

        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    })
    .catch(() => undefined);
}
