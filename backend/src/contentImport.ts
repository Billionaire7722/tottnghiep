import path from "node:path";
import { type DraftQuestion } from "@/src/importQuestions";
import { parseAndReviewQuestions } from "@/src/questionImportReview";
import type { SubjectCode } from "@/src/subjects";

export type DraftStudyLesson = {
  title: string;
  summary: string;
  content: string;
  isActive: boolean;
  warnings: string[];
};

export async function parseAndReviewImportedContent(text: string, subject: SubjectCode, sourceName = "Tài liệu nhập") {
  const questionReview = await parseAndReviewQuestions(text, subject);
  const lessons = buildStudyLessons(text, sourceName, questionReview.questions);
  const warnings = [...questionReview.warnings];

  if (questionReview.questions.length > 0 && lessons.length === 0) {
    warnings.push("Tài liệu có câu hỏi nên hệ thống không dùng nội dung này để tạo phần ôn tập");
  }

  if (lessons.length === 0 && questionReview.questions.length === 0) {
    warnings.push("Không nhận diện được câu hỏi hoặc nội dung kiến thức đủ dài trong tài liệu");
  }

  if (lessons.length > 0) {
    warnings.push(`Đã nhận diện ${lessons.length} bài ôn tập từ phần kiến thức trong tài liệu`);
  }

  return {
    questions: questionReview.questions,
    lessons,
    warnings
  };
}

function buildStudyLessons(text: string, sourceName: string, questions: DraftQuestion[]) {
  if (questions.length > 0) {
    return [];
  }

  const normalized = normalizeKnowledgeText(text);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  if (normalized.length < 400 || shouldTreatAsQuestionBank(sourceName, lines, questions)) {
    return [];
  }

  const knowledgeText = removeQuestionLikeLines(normalized);
  const content = knowledgeText.length >= 400 ? knowledgeText : normalized;
  const chunks = chunkText(content, 11000);
  const baseTitle = titleFromSourceName(sourceName);

  return chunks.map<DraftStudyLesson>((chunk, index) => ({
    title: chunks.length > 1 ? trimText(`${baseTitle} - phần ${index + 1}`, 160) : baseTitle,
    summary: summarizeLesson(chunk),
    content: chunk,
    isActive: true,
    warnings: []
  }));
}

function shouldTreatAsQuestionBank(sourceName: string, lines: string[], questions: DraftQuestion[]) {
  const normalizedSource = stripDiacritics(sourceName).toLowerCase().replace(/\\/g, "/");
  const baseName = path.posix.basename(normalizedSource);
  const looksLikeExamFile = /(?:^|[\/\s_.-])(test|de thi|trac nghiem|cau hoi|review)(?:$|[\/\s_.-])/.test(
    normalizedSource
  );
  const questionSignals = lines.filter(
    (line) =>
      /^(?:cau\s*)?\d+[\).:\-]\s+/i.test(stripDiacritics(line)) ||
      /^\*?\s*[A-F][\).:\-]\s*\S/i.test(line) ||
      /^(?:dap\s*an|answer)\s*[:\-]/i.test(stripDiacritics(line))
  ).length;

  if (looksLikeExamFile) {
    return true;
  }

  if (/\bde\s*so\s*\d+\b/.test(baseName)) {
    return true;
  }

  if (questionSignals >= 8 && questionSignals >= Math.floor(lines.length * 0.18)) {
    return true;
  }

  return questions.length >= 3 && questionSignals >= Math.max(questions.length * 2, Math.floor(lines.length * 0.25));
}

function removeQuestionLikeLines(text: string) {
  return text
    .split("\n")
    .filter((line) => {
      const normalized = stripDiacritics(line.trim()).toLowerCase();

      if (!normalized) {
        return true;
      }

      return !(
        /^(?:cau\s*)?\d+[\).:\-]\s+/.test(normalized) ||
        /^\*?\s*[a-f][\).:\-]\s*\S/.test(normalized) ||
        /^(?:dap\s*an|answer|giai\s*thich|ghi\s*chu)\s*[:\-]/.test(normalized)
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeKnowledgeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/-\n(?=\p{L})/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .filter((line) => !/^\s*(?:\d+|slide\s+\d+)\s*$/i.test(line))
    .join("\n")
    .trim();
}

function chunkText(text: string, maxLength: number) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if (current.length + paragraph.length + 2 > maxLength) {
      chunks.push(current);
      current = paragraph;
      continue;
    }

    current = `${current}\n\n${paragraph}`;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) => splitLongChunk(chunk, maxLength));
}

function splitLongChunk(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength).trim());
  }

  return chunks.filter(Boolean);
}

function titleFromSourceName(sourceName: string) {
  const parsed = path.parse(sourceName);
  const title = parsed.name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return trimText(title || "Tài liệu ôn tập", 160);
}

function summarizeLesson(content: string) {
  const firstTextLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length >= 30);

  return trimText(firstTextLine ?? content.replace(/\s+/g, " ").trim(), 500);
}

function trimText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
