import mammoth from "mammoth";
import { ApiError } from "@/src/http";

type ParsedOption = {
  content: string;
  isCorrect: boolean;
};

type ParsedQuestion = {
  content: string;
  explanation: string;
  isActive: boolean;
  options: ParsedOption[];
};

type DraftQuestion = ParsedQuestion & {
  warnings: string[];
};

const answerLabels = ["A", "B", "C", "D", "E", "F"];

export async function extractTextFromQuestionFile(file: File) {
  const maxBytes = 2 * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new ApiError(400, "FILE_TOO_LARGE", "File tối đa 2MB");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (["txt", "md", "csv"].includes(extension) || file.type.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  if (extension === "doc") {
    throw new ApiError(400, "UNSUPPORTED_DOC", "File .doc cũ chưa được hỗ trợ, vui lòng lưu lại thành .docx hoặc .txt");
  }

  throw new ApiError(400, "UNSUPPORTED_FILE", "Chỉ hỗ trợ file .txt, .md, .csv hoặc .docx");
}

export function parseQuestionText(text: string) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const questions: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;
  let currentMode: "content" | "option" | "explanation" = "content";
  let currentOptionIndex = -1;

  for (const line of lines) {
    const questionMatch = line.match(/^(?:câu\s*)?(\d+)[\).:\-]\s*(.+)$/i);

    if (questionMatch) {
      pushCurrent(questions, current);
      current = createDraft(questionMatch[2]);
      currentMode = "content";
      currentOptionIndex = -1;
      continue;
    }

    if (!current) {
      current = createDraft(line);
      continue;
    }

    const answerMatch = line.match(/^(?:đáp\s*án|dap\s*an|answer|đáp án đúng)\s*[:\-]\s*([A-F])/i);

    if (answerMatch) {
      markCorrectByLabel(current, answerMatch[1]);
      currentMode = "explanation";
      currentOptionIndex = -1;
      continue;
    }

    const explanationMatch = line.match(/^(?:giải\s*thích|giai\s*thich|ghi\s*chú|ghi chu)\s*[:\-]\s*(.+)$/i);

    if (explanationMatch) {
      current.explanation = appendText(current.explanation, explanationMatch[1]);
      currentMode = "explanation";
      currentOptionIndex = -1;
      continue;
    }

    const optionMatch = line.match(/^\*?\s*([A-F])[\).:\-]\s*(.+)$/i);

    if (optionMatch) {
      const startsCorrect = line.trim().startsWith("*") || optionMatch[2].trim().startsWith("*");
      const optionText = optionMatch[2].replace(/^\*\s*/, "").trim();

      if (current.options.length < 6) {
        current.options.push({
          content: optionText,
          isCorrect: startsCorrect
        });
        currentOptionIndex = current.options.length - 1;
      } else {
        current.warnings.push("Bỏ qua đáp án vượt quá giới hạn 6 đáp án");
      }

      currentMode = "option";
      continue;
    }

    if (currentMode === "explanation") {
      current.explanation = appendText(current.explanation, line);
    } else if (currentMode === "option" && currentOptionIndex >= 0) {
      current.options[currentOptionIndex].content = appendText(current.options[currentOptionIndex].content, line);
    } else {
      current.content = appendText(current.content, line);
    }
  }

  pushCurrent(questions, current);

  return questions.map((question, index) => normalizeDraft(question, index));
}

function createDraft(content: string): DraftQuestion {
  return {
    content: content.trim(),
    explanation: "",
    isActive: true,
    options: [],
    warnings: []
  };
}

function pushCurrent(questions: DraftQuestion[], current: DraftQuestion | null) {
  if (current?.content) {
    questions.push(current);
  }
}

function normalizeDraft(question: DraftQuestion, index: number) {
  const next = {
    ...question,
    options: question.options.filter((option) => option.content.trim()).slice(0, 6)
  };
  const correctCount = next.options.filter((option) => option.isCorrect).length;

  if (next.options.length < 2) {
    next.warnings.push(`Câu ${index + 1} có ít hơn 2 đáp án`);
  }

  if (correctCount === 0 && next.options.length > 0) {
    next.options = next.options.map((option, optionIndex) => ({
      ...option,
      isCorrect: optionIndex === 0
    }));
    next.warnings.push(`Câu ${index + 1} chưa có đáp án đúng, hệ thống tạm chọn đáp án đầu tiên`);
  }

  if (correctCount > 1) {
    let kept = false;
    next.options = next.options.map((option) => {
      if (!option.isCorrect || kept) {
        return { ...option, isCorrect: false };
      }

      kept = true;
      return option;
    });
    next.warnings.push(`Câu ${index + 1} có nhiều đáp án đúng, hệ thống giữ đáp án đúng đầu tiên`);
  }

  return next;
}

function markCorrectByLabel(question: DraftQuestion, label: string) {
  const index = answerLabels.indexOf(label.toUpperCase());

  question.options = question.options.map((option, optionIndex) => ({
    ...option,
    isCorrect: optionIndex === index
  }));

  if (index < 0 || index >= question.options.length) {
    question.warnings.push(`Không tìm thấy đáp án ${label.toUpperCase()} trong câu "${question.content}"`);
  }
}

function appendText(current: string, value: string) {
  return [current, value.trim()].filter(Boolean).join(" ");
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

