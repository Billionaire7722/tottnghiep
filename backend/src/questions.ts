import type { PoolClient } from "pg";
import { dbQuery, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import type { SubjectCode } from "@/src/subjects";
import type { QuestionInput } from "@/src/validation";

type QuestionOptionRow = {
  id: number;
  label: string;
  content: string;
  isCorrect: boolean;
};

type QuestionRow = {
  id: number;
  subject: SubjectCode;
  content: string;
  explanation: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  options: QuestionOptionRow[];
};

const labels = ["A", "B", "C", "D", "E", "F"];

export async function listQuestions(includeInactive: boolean, includeAnswers: boolean, subject?: SubjectCode | null) {
  const result = await dbQuery<QuestionRow>(
    `
      SELECT
        q.id,
        q.subject,
        q.content,
        q.explanation,
        q.is_active AS "isActive",
        q.created_at AS "createdAt",
        q.updated_at AS "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'label', o.label,
              'content', o.content,
              'isCorrect', o.is_correct
            )
            ORDER BY o.label
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS options
      FROM questions q
      LEFT JOIN options o ON o.question_id = q.id
      WHERE ($1::boolean = true OR q.is_active = true)
        AND ($2::text IS NULL OR q.subject = $2)
      GROUP BY q.id
      ORDER BY q.created_at DESC, q.id DESC
    `,
    [includeInactive, subject ?? null]
  );

  const questions = result.rows.map((question) => ({
    ...question,
    options: includeAnswers
      ? question.options
      : relabelOptions(shuffleArray(question.options)).map(({ isCorrect: _isCorrect, ...option }) => option)
  }));

  return includeAnswers ? questions : shuffleArray(questions);
}

export async function createQuestion(input: QuestionInput, adminId: string) {
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: number }>(
      `
        INSERT INTO questions (subject, content, explanation, is_active, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [input.subject, input.content, normalizeExplanation(input.explanation), input.isActive ?? true, adminId]
    );

    await replaceOptions(client, inserted.rows[0].id, input.options);
    return getQuestionForAdmin(client, inserted.rows[0].id);
  });
}

export async function updateQuestion(id: number, input: QuestionInput) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: number }>("SELECT id FROM questions WHERE id = $1", [id]);

    if (!existing.rows[0]) {
      throw new ApiError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi");
    }

    await client.query(
      `
        UPDATE questions
        SET subject = $1,
            content = $2,
            explanation = $3,
            is_active = $4,
            updated_at = now()
        WHERE id = $5
      `,
      [input.subject, input.content, normalizeExplanation(input.explanation), input.isActive ?? true, id]
    );

    await client.query("DELETE FROM options WHERE question_id = $1", [id]);
    await replaceOptions(client, id, input.options);
    return getQuestionForAdmin(client, id);
  });
}

export async function deleteQuestion(id: number) {
  const result = await dbQuery(
    `
      DELETE FROM questions
      WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi");
  }
}

function shuffleArray<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function relabelOptions(options: QuestionOptionRow[]) {
  return options.map((option, index) => ({
    ...option,
    label: labels[index] ?? option.label
  }));
}

async function replaceOptions(client: PoolClient, questionId: number, options: QuestionInput["options"]) {
  for (const [index, option] of options.entries()) {
    await client.query(
      `
        INSERT INTO options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `,
      [questionId, labels[index], option.content, option.isCorrect]
    );
  }
}

async function getQuestionForAdmin(client: PoolClient, id: number) {
  const result = await client.query<QuestionRow>(
    `
      SELECT
        q.id,
        q.subject,
        q.content,
        q.explanation,
        q.is_active AS "isActive",
        q.created_at AS "createdAt",
        q.updated_at AS "updatedAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', o.id,
              'label', o.label,
              'content', o.content,
              'isCorrect', o.is_correct
            )
            ORDER BY o.label
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'
        ) AS options
      FROM questions q
      LEFT JOIN options o ON o.question_id = q.id
      WHERE q.id = $1
      GROUP BY q.id
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
}

function normalizeExplanation(explanation: string | null | undefined) {
  const value = explanation?.trim();
  return value ? value : null;
}
