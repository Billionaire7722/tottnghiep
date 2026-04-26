import { z } from "zod";
import { roles } from "@/src/roles";
import { subjects } from "@/src/subjects";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Tên đăng nhập cần ít nhất 3 ký tự")
  .max(40, "Tên đăng nhập quá dài")
  .regex(/^[a-zA-Z0-9_.-]+$/, "Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang")
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  deviceId: z.string().trim().min(8).max(120).optional()
});

export const optionSchema = z.object({
  content: z.string().trim().min(1, "Nội dung đáp án không được trống").max(500),
  isCorrect: z.boolean()
});

export const questionSchema = z
  .object({
    subject: z.enum(subjects).default("dich_te"),
    content: z.string().trim().min(5, "Câu hỏi cần ít nhất 5 ký tự").max(6000, "Câu hỏi tối đa 6.000 ký tự"),
    explanation: z.string().trim().max(4000, "Giải thích tối đa 4.000 ký tự").optional().nullable(),
    isActive: z.boolean().optional(),
    options: z.array(optionSchema).max(6, "Tối đa 6 đáp án")
  })
  .superRefine((data, ctx) => {
    const correctCount = data.options.filter((option) => option.isCorrect).length;
    const shouldPublish = data.isActive ?? true;

    if (correctCount > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Mỗi câu hỏi chỉ được có 1 đáp án đúng",
        path: ["options"]
      });
    }

    if (!shouldPublish) {
      return;
    }

    if (data.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Cần ít nhất 2 đáp án trước khi hiển thị câu hỏi cho người học",
        path: ["options"]
      });
    }

    if (correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Cần chọn đúng 1 đáp án đúng trước khi hiển thị câu hỏi cho người học",
        path: ["options"]
      });
    }
  });

export const studyLessonSchema = z.object({
  subject: z.enum(subjects).default("dich_te"),
  title: z.string().trim().min(3, "Tiêu đề bài ôn cần ít nhất 3 ký tự").max(160, "Tiêu đề quá dài"),
  summary: z.string().trim().max(500, "Tóm tắt tối đa 500 ký tự").optional().default(""),
  content: z.string().trim().min(5, "Nội dung bài ôn cần ít nhất 5 ký tự").max(12000, "Nội dung bài ôn tối đa 12.000 ký tự"),
  isActive: z.boolean().optional()
});

export const accountCreateSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(2, "Tên hiển thị cần ít nhất 2 ký tự").max(80),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(120),
  role: z.enum(roles).default("user"),
  isActive: z.boolean().default(true)
});

export const accountUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    password: z.string().min(8).max(120).optional().or(z.literal("")),
    role: z.enum(roles).optional(),
    isActive: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, "Không có dữ liệu cần cập nhật");

export const answerSubmitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.coerce.number().int().positive(),
        optionId: z.coerce.number().int().positive()
      })
    )
    .min(1, "Cần chọn ít nhất một đáp án")
});

export const answerCheckSchema = z.object({
  questionId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive()
});

export const questionTextImportSchema = z.object({
  subject: z.enum(subjects).default("dich_te"),
  text: z.string().trim().min(5, "Vui lòng nhập nội dung câu hỏi").max(100000, "Nội dung tối đa 100.000 ký tự")
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type StudyLessonInput = z.infer<typeof studyLessonSchema>;
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type AnswerSubmitInput = z.infer<typeof answerSubmitSchema>;
export type AnswerCheckInput = z.infer<typeof answerCheckSchema>;
export type QuestionTextImportInput = z.infer<typeof questionTextImportSchema>;
