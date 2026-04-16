import type { PoolClient } from "pg";
import { dbQuery, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import type { QuestionInput } from "@/src/validation";

type QuestionOptionRow = {
  id: number;
  label: string;
  content: string;
  isCorrect: boolean;
};

type QuestionRow = {
  id: number;
  content: string;
  explanation: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  options: QuestionOptionRow[];
};

const labels = ["A", "B", "C", "D", "E", "F"];

export async function listQuestions(includeInactive: boolean, includeAnswers: boolean) {
  const result = await dbQuery<QuestionRow>(
    `
      SELECT
        q.id,
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
      GROUP BY q.id
      ORDER BY q.created_at DESC, q.id DESC
    `,
    [includeInactive]
  );

  return result.rows.map((question) => ({
    ...question,
    options: includeAnswers
      ? question.options
      : question.options.map(({ isCorrect: _isCorrect, ...option }) => option)
  }));
}

export async function createQuestion(input: QuestionInput, adminId: string) {
  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: number }>(
      `
        INSERT INTO questions (content, explanation, is_active, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [input.content, normalizeExplanation(input.explanation), input.isActive ?? true, adminId]
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
        SET content = $1,
            explanation = $2,
            is_active = $3,
            updated_at = now()
        WHERE id = $4
      `,
      [input.content, normalizeExplanation(input.explanation), input.isActive ?? true, id]
    );

    await client.query("DELETE FROM options WHERE question_id = $1", [id]);
    await replaceOptions(client, id, input.options);
    return getQuestionForAdmin(client, id);
  });
}

export async function hideQuestion(id: number) {
  const result = await dbQuery(
    `
      UPDATE questions
      SET is_active = false,
          updated_at = now()
      WHERE id = $1
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new ApiError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi");
  }
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

