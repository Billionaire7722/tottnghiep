export const subjects = [
  "dich_te",
  "suc_khoe_nghe_nghiep",
  "dinh_duong",
  "suc_khoe_moi_truong"
] as const;

export type SubjectCode = (typeof subjects)[number];

export function isSubjectCode(value: string | null | undefined): value is SubjectCode {
  return subjects.includes(value as SubjectCode);
}

