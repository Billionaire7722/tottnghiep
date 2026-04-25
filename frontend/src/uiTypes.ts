export type Screen = "start" | "mode" | "study" | "quiz" | "result" | "history" | "admin";
export type AdminTab = "questions" | "accounts";
export type AccountRole = "admin" | "editor" | "user";

export const subjectOptions = [
  {
    value: "dich_te",
    label: "Dịch tễ",
    shortLabel: "Dịch tễ",
    icon: "✣",
    description: "Yếu tố dịch tễ học, sàng tuyển, chỉ số sức khỏe."
  },
  {
    value: "suc_khoe_nghe_nghiep",
    label: "Sức khỏe nghề nghiệp",
    shortLabel: "Nghề nghiệp",
    icon: "▦",
    description: "Mối nguy, bệnh nghề nghiệp và an toàn lao động."
  },
  {
    value: "dinh_duong",
    label: "Dinh dưỡng",
    shortLabel: "Dinh dưỡng",
    icon: "●",
    description: "Khẩu phần, vi chất, năng lượng và bệnh liên quan."
  },
  {
    value: "suc_khoe_moi_truong",
    label: "Sức khỏe môi trường",
    shortLabel: "Môi trường",
    icon: "◌",
    description: "Nước, không khí, chất thải và nguy cơ môi trường."
  }
] as const;

export type SubjectCode = (typeof subjectOptions)[number]["value"];

export type StudyTopic = {
  title: string;
  description: string;
};

export const subjectStudyTopics: Record<SubjectCode, StudyTopic[]> = {
  dich_te: [
    {
      title: "Khái niệm Dịch tễ học",
      description: "Định nghĩa, mục tiêu, vai trò của dịch tễ học trong y tế công cộng."
    },
    {
      title: "Các chỉ số sức khỏe",
      description: "Tỷ lệ mắc bệnh, tỷ lệ tử vong và các chỉ số thường gặp."
    },
    {
      title: "Phương pháp nghiên cứu",
      description: "Quan sát, can thiệp và phân tích số liệu dịch tễ học."
    },
    {
      title: "Sàng tuyển và chẩn đoán",
      description: "Độ nhạy, độ đặc hiệu và nguyên lý đánh giá xét nghiệm."
    }
  ],
  suc_khoe_nghe_nghiep: [
    {
      title: "Yếu tố nguy cơ nghề nghiệp",
      description: "Nhận diện tác nhân vật lý, hóa học, sinh học và tâm sinh lý."
    },
    {
      title: "Bệnh nghề nghiệp",
      description: "Cơ chế phát sinh, giám sát và phòng ngừa bệnh nghề nghiệp."
    },
    {
      title: "An toàn lao động",
      description: "Biện pháp kiểm soát nguy cơ và bảo hộ cá nhân."
    }
  ],
  dinh_duong: [
    {
      title: "Nhu cầu năng lượng",
      description: "Cách xác định nhu cầu năng lượng và cân bằng khẩu phần."
    },
    {
      title: "Vi chất dinh dưỡng",
      description: "Vai trò của vitamin, khoáng chất và dấu hiệu thiếu hụt."
    },
    {
      title: "Dinh dưỡng cộng đồng",
      description: "Đánh giá tình trạng dinh dưỡng và can thiệp cộng đồng."
    }
  ],
  suc_khoe_moi_truong: [
    {
      title: "Ô nhiễm môi trường",
      description: "Nguồn ô nhiễm không khí, nước, đất và tác động sức khỏe."
    },
    {
      title: "Nước sạch và vệ sinh",
      description: "Tiêu chuẩn nước sạch, vệ sinh môi trường và phòng bệnh."
    },
    {
      title: "Quản lý chất thải",
      description: "Phân loại, thu gom và xử lý chất thải y tế, sinh hoạt."
    }
  ]
};

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

export function getSubjectOption(value: SubjectCode | string | undefined) {
  return subjectOptions.find((subject) => subject.value === value) ?? subjectOptions[0];
}

export function subjectLabel(value: SubjectCode | string | undefined) {
  return getSubjectOption(value).label;
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
