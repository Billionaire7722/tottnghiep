import { parseQuestionText, type DraftQuestion } from "@/src/importQuestions";
import { questionFingerprint } from "@/src/questionIdentity";
import { getExistingQuestionFingerprints } from "@/src/questions";
import type { SubjectCode } from "@/src/subjects";

export async function parseAndReviewQuestions(text: string, subject: SubjectCode) {
  const parsedQuestions = parseQuestionText(text);
  const existingFingerprints = await getExistingQuestionFingerprints(subject);
  const batchFingerprints = new Set<string>();
  const questions: DraftQuestion[] = [];
  const warnings: string[] = [];
  let duplicateCount = 0;

  for (const question of parsedQuestions) {
    const fingerprint = questionFingerprint(question.content);

    if (existingFingerprints.has(fingerprint)) {
      duplicateCount += 1;
      warnings.push(`Đã bỏ qua câu trùng với câu hỏi đã có: "${previewText(question.content)}"`);
      continue;
    }

    if (batchFingerprints.has(fingerprint)) {
      duplicateCount += 1;
      warnings.push(`Đã bỏ qua câu trùng trong nội dung vừa nhập: "${previewText(question.content)}"`);
      continue;
    }

    batchFingerprints.add(fingerprint);
    questions.push(question);
  }

  if (duplicateCount > 0) {
    warnings.unshift(`Đã tự động loại bỏ ${duplicateCount} câu hỏi bị trùng lặp`);
  }

  return {
    questions,
    warnings: [...warnings, ...questions.flatMap((question) => question.warnings)]
  };
}

function previewText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}
