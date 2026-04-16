import { z } from "zod";
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
    options: z.array(optionSchema).min(2, "Cần ít nhất 2 đáp án").max(6, "Tối đa 6 đáp án")
  })
  .superRefine((data, ctx) => {
    const correctCount = data.options.filter((option) => option.isCorrect).length;

    if (correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Mỗi câu hỏi phải có đúng 1 đáp án đúng",
        path: ["options"]
      });
    }
  });

export const accountCreateSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(2, "Tên hiển thị cần ít nhất 2 ký tự").max(80),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(120),
  role: z.enum(["admin", "user"]).default("user"),
  isActive: z.boolean().default(true)
});

export const accountUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    password: z.string().min(8).max(120).optional().or(z.literal("")),
    role: z.enum(["admin", "user"]).optional(),
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
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type AnswerSubmitInput = z.infer<typeof answerSubmitSchema>;
export type AnswerCheckInput = z.infer<typeof answerCheckSchema>;
export type QuestionTextImportInput = z.infer<typeof questionTextImportSchema>;
