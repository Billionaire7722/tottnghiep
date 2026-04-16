import mammoth from "mammoth";
import { ApiError } from "@/src/http";

export type ParsedOption = {
  content: string;
  isCorrect: boolean;
};

export type ParsedQuestion = {
  content: string;
  explanation: string;
  isActive: boolean;
  options: ParsedOption[];
};

export type DraftQuestion = ParsedQuestion & {
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
  let parentContent = "";
  let currentMode: "content" | "option" | "explanation" = "content";
  let currentOptionIndex = -1;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const nextLine = lines[lineIndex + 1];
    const parentMatch = line.match(/^(?:câu\s*hỏi|cau\s*hoi|tình\s*huống|tinh\s*huong|dữ\s*liệu|du\s*lieu)\s*[:\-]\s*(.+)$/i);

    if (parentMatch) {
      pushCurrent(questions, current);
      current = hasUpcomingSubQuestion(lines, lineIndex + 1) ? null : createDraft(parentMatch[1]);
      parentContent = current ? "" : parentMatch[1].trim();
      currentMode = "content";
      currentOptionIndex = -1;
      continue;
    }

    const subQuestionMatch = line.match(/^\+\s*(?:câu\s*hỏi\s*nhỏ|cau\s*hoi\s*nho|ý|y)\s*[:\-]\s*(.*)$/i);

    if (subQuestionMatch) {
      pushCurrent(questions, current);
      current = createDraft(formatGroupedQuestion(parentContent, subQuestionMatch[1]));
      currentMode = "content";
      currentOptionIndex = -1;
      continue;
    }

    const questionMatch = line.match(/^(?:câu\s*)?(\d+)[\).:\-]\s*(.+)$/i);

    if (questionMatch) {
      pushCurrent(questions, current);
      parentContent = "";
      current = createDraft(questionMatch[2]);
      currentMode = "content";
      currentOptionIndex = -1;
      continue;
    }

    if (!current) {
      if (parentContent) {
        parentContent = appendBlock(parentContent, line);
        continue;
      }

      current = createDraft(line);
      continue;
    }

    if (shouldStartUnnumberedQuestion(current, line, nextLine)) {
      pushCurrent(questions, current);
      current = createDraft(line);
      currentMode = "content";
      currentOptionIndex = -1;
      continue;
    }

    const answerMatch = line.match(/^(?:đáp\s*án|dap\s*an|answer|đáp án đúng)\s*[:\-]\s*(.+)$/i);

    if (answerMatch) {
      markCorrectAnswer(current, answerMatch[1]);
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
      current.explanation = appendBlock(current.explanation, line);
    } else if (currentMode === "option" && currentOptionIndex >= 0) {
      current.options[currentOptionIndex].content = appendText(current.options[currentOptionIndex].content, line);
    } else {
      current.content = appendBlock(current.content, line);
    }
  }

  pushCurrent(questions, current);

  return questions.map((question, index) => normalizeDraft(question, index));
}

function formatGroupedQuestion(parentContent: string, subQuestion: string) {
  const parent = parentContent.trim();
  const child = subQuestion.trim();

  if (!parent) {
    return child || "Câu hỏi nhỏ";
  }

  if (!child) {
    return parent;
  }

  return `${parent}\n\n${child}`;
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

function shouldStartUnnumberedQuestion(current: DraftQuestion, line: string, nextLine: string | undefined) {
  if (current.options.length < 2 || !nextLine) {
    return false;
  }

  if (!isFirstOptionLine(nextLine) || isAnswerLine(line) || isExplanationLine(line) || isOptionLine(line)) {
    return false;
  }

  return current.options.some((option) => option.isCorrect) || current.options.length >= 3 || hasTrueFalseOptions(current);
}

function hasUpcomingSubQuestion(lines: string[], startIndex: number) {
  let insideChart = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (isChartStart(line)) {
      insideChart = true;
      continue;
    }

    if (insideChart) {
      if (isChartEnd(line)) {
        insideChart = false;
      }

      continue;
    }

    if (isSubQuestionLine(line)) {
      return true;
    }

    if (isNumberedQuestionLine(line) || isParentLine(line) || isOptionLine(line) || isAnswerLine(line) || isExplanationLine(line)) {
      return false;
    }
  }

  return false;
}

function isParentLine(line: string) {
  return /^(?:câu\s*hỏi|cau\s*hoi|tình\s*huống|tinh\s*huong|dữ\s*liệu|du\s*lieu)\s*[:\-]\s*(.+)$/i.test(line);
}

function isSubQuestionLine(line: string) {
  return /^\+\s*(?:câu\s*hỏi\s*nhỏ|cau\s*hoi\s*nho|ý|y)\s*[:\-]\s*(.*)$/i.test(line);
}

function isNumberedQuestionLine(line: string) {
  return /^(?:câu\s*)?(\d+)[\).:\-]\s*(.+)$/i.test(line);
}

function isChartStart(line: string) {
  return /^\[(?:chart|biểu\s*đồ|bieu\s*do)\]$/i.test(line);
}

function isChartEnd(line: string) {
  return /^\[\/(?:chart|biểu\s*đồ|bieu\s*do)\]$/i.test(line);
}

function markCorrectAnswer(question: DraftQuestion, value: string) {
  const labelMatch = value.trim().match(/^([A-F])(?:\b|[\).:\-])/i);

  if (labelMatch) {
    markCorrectByLabel(question, labelMatch[1]);
    return;
  }

  const normalizedValue = normalizeAnswerText(value);
  const optionIndex = question.options.findIndex((option) => normalizeAnswerText(option.content) === normalizedValue);

  if (optionIndex >= 0) {
    question.options = question.options.map((option, index) => ({
      ...option,
      isCorrect: index === optionIndex
    }));
    return;
  }

  question.warnings.push(`Không tìm thấy đáp án "${value.trim()}" trong câu "${question.content}"`);
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

function isAnswerLine(line: string) {
  return /^(?:đáp\s*án|dap\s*an|answer|đáp án đúng)\s*[:\-]\s*(.+)$/i.test(line);
}

function isExplanationLine(line: string) {
  return /^(?:giải\s*thích|giai\s*thich|ghi\s*chú|ghi chu)\s*[:\-]\s*(.+)$/i.test(line);
}

function isOptionLine(line: string) {
  return /^\*?\s*([A-F])[\).:\-]\s*(.+)$/i.test(line);
}

function isFirstOptionLine(line: string) {
  return /^\*?\s*A[\).:\-]\s*\S/i.test(line);
}

function hasTrueFalseOptions(question: DraftQuestion) {
  if (question.options.length !== 2) {
    return false;
  }

  const normalizedOptions = question.options.map((option) => normalizeAnswerText(option.content));
  return normalizedOptions.includes("dung") && normalizedOptions.includes("sai");
}

function normalizeAnswerText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function appendText(current: string, value: string) {
  return [current, value.trim()].filter(Boolean).join(" ");
}

function appendBlock(current: string, value: string) {
  return [current, value.trim()].filter(Boolean).join("\n");
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}
