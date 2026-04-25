import { dbQuery, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import type { SubjectCode } from "@/src/subjects";
import type { StudyLessonInput } from "@/src/validation";

type StudyLessonRow = {
  id: number;
  subject: SubjectCode;
  title: string;
  summary: string;
  content: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function listStudyLessons(includeInactive: boolean, subject?: SubjectCode | null) {
  const result = await dbQuery<StudyLessonRow>(
    `
      SELECT
        id,
        subject,
        title,
        summary,
        content,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM study_lessons
      WHERE ($1::boolean = true OR is_active = true)
        AND ($2::text IS NULL OR subject = $2)
      ORDER BY subject ASC, created_at DESC, id DESC
    `,
    [includeInactive, subject ?? null]
  );

  return result.rows;
}

export async function createStudyLesson(input: StudyLessonInput, adminId: string) {
  const result = await dbQuery<StudyLessonRow>(
    `
      INSERT INTO study_lessons (subject, title, summary, content, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        subject,
        title,
        summary,
        content,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [input.subject, input.title, input.summary ?? "", input.content, input.isActive ?? true, adminId]
  );

  return result.rows[0];
}

export async function updateStudyLesson(id: number, input: StudyLessonInput) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: number }>("SELECT id FROM study_lessons WHERE id = $1", [id]);

    if (!existing.rows[0]) {
      throw new ApiError(404, "STUDY_LESSON_NOT_FOUND", "Không tìm thấy bài ôn tập");
    }

    const result = await client.query<StudyLessonRow>(
      `
        UPDATE study_lessons
        SET subject = $1,
            title = $2,
            summary = $3,
            content = $4,
            is_active = $5,
            updated_at = now()
        WHERE id = $6
        RETURNING
          id,
          subject,
          title,
          summary,
          content,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [input.subject, input.title, input.summary ?? "", input.content, input.isActive ?? true, id]
    );

    return result.rows[0];
  });
}

export async function deleteStudyLesson(id: number) {
  const result = await dbQuery(
    `
      DELETE FROM study_lessons
      WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, "STUDY_LESSON_NOT_FOUND", "Không tìm thấy bài ôn tập");
  }
}
