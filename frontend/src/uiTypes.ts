export type Screen = "start" | "quiz" | "result" | "history" | "admin";
export type AdminTab = "questions" | "accounts";

export type QuestionForm = {
  content: string;
  explanation: string;
  isActive: boolean;
  options: Array<{
    content: string;
    isCorrect: boolean;
  }>;
};

export type AccountForm = {
  username: string;
  displayName: string;
  password: string;
  role: "admin" | "user";
  isActive: boolean;
};

export const emptyQuestionForm = (): QuestionForm => ({
  content: "",
  explanation: "",
  isActive: true,
  options: [
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false }
  ]
});

export const emptyAccountForm = (): AccountForm => ({
  username: "",
  displayName: "",
  password: "",
  role: "user",
  isActive: true
});

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

