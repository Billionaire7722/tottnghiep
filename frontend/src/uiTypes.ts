export type Screen = "start" | "quiz" | "result" | "history" | "admin";
export type AdminTab = "questions" | "accounts";
export type AccountRole = "admin" | "editor" | "user";

export const subjectOptions = [
  { value: "dich_te", label: "Dịch tễ" },
  { value: "suc_khoe_nghe_nghiep", label: "Sức khỏe nghề nghiệp" },
  { value: "dinh_duong", label: "Dinh dưỡng" },
  { value: "suc_khoe_moi_truong", label: "Sức khỏe môi trường" }
] as const;

export type SubjectCode = (typeof subjectOptions)[number]["value"];

export type QuestionForm = {
  subject: SubjectCode;
  content: string;
  explanation: string;
  isActive: boolean;
  options: Array<{
    content: string;
    isCorrect: boolean;
  }>;
};

export type ImportedQuestionForm = QuestionForm & {
  warnings?: string[];
};

export type AccountForm = {
  username: string;
  displayName: string;
  password: string;
  role: AccountRole;
  isActive: boolean;
};

export const emptyQuestionForm = (): QuestionForm => ({
  subject: "dich_te",
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

export function subjectLabel(value: SubjectCode | string | undefined) {
  return subjectOptions.find((subject) => subject.value === value)?.label ?? "Chưa chọn môn";
}

export function roleLabel(value: AccountRole | string | undefined) {
  if (value === "admin") {
    return "Quản trị viên";
  }

  if (value === "editor") {
    return "Người chỉnh sửa";
  }

  return "Người học";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
