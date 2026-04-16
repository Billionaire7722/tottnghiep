import { dbQuery, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import type { AuthUser } from "@/src/auth";
import type { AnswerSubmitInput } from "@/src/validation";

type QuestionOptionForGrading = {
  questionId: number;
  questionContent: string;
  optionId: number;
  optionContent: string;
  isCorrect: boolean;
};

type AttemptRow = {
  id: string;
  userDisplayName: string;
  username: string | null;
  score: number;
  total: number;
  percentage: string;
  createdAt: Date | string;
};

export async function submitAnswers(input: AnswerSubmitInput, user: AuthUser) {
  const questionIds = input.answers.map((answer) => answer.questionId);
  const uniqueQuestionIds = [...new Set(questionIds)];

  if (uniqueQuestionIds.length !== questionIds.length) {
    throw new ApiError(400, "DUPLICATE_ANSWERS", "Mỗi câu hỏi chỉ được gửi một đáp án");
  }

  const rows = await dbQuery<QuestionOptionForGrading>(
    `
      SELECT
        q.id AS "questionId",
        q.content AS "questionContent",
        o.id AS "optionId",
        o.content AS "optionContent",
        o.is_correct AS "isCorrect"
      FROM questions q
      JOIN options o ON o.question_id = q.id
      WHERE q.id = ANY($1::int[])
        AND q.is_active = true
      ORDER BY q.id ASC, o.label ASC
    `,
    [uniqueQuestionIds]
  );

  const questionMap = new Map<
    number,
    {
      id: number;
      content: string;
      options: QuestionOptionForGrading[];
    }
  >();

  for (const row of rows.rows) {
    const question = questionMap.get(row.questionId) ?? {
      id: row.questionId,
      content: row.questionContent,
      options: []
    };
    question.options.push(row);
    questionMap.set(row.questionId, question);
  }

  if (questionMap.size !== uniqueQuestionIds.length) {
    throw new ApiError(400, "QUESTION_UNAVAILABLE", "Một số câu hỏi không còn khả dụng");
  }

  const answerDetails = input.answers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    const selected = question?.options.find((option) => option.optionId === answer.optionId);
    const correct = question?.options.find((option) => option.isCorrect);

    if (!question || !selected || !correct) {
      throw new ApiError(400, "INVALID_ANSWER", "Đáp án gửi lên không hợp lệ");
    }

    return {
      questionId: question.id,
      questionContent: question.content,
      selectedOptionId: selected.optionId,
      selectedOptionContent: selected.optionContent,
      correctOptionId: correct.optionId,
      correctOptionContent: correct.optionContent,
      isCorrect: selected.optionId === correct.optionId
    };
  });

  const score = answerDetails.filter((answer) => answer.isCorrect).length;
  const total = answerDetails.length;
  const percentage = Math.round((score / total) * 10000) / 100;

  const attempt = await withTransaction(async (client) => {
    const inserted = await client.query<{ id: string; createdAt: Date | string }>(
      `
        INSERT INTO attempts (user_id, user_display_name, score, total, percentage)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at AS "createdAt"
      `,
      [user.id, user.displayName, score, total, percentage]
    );
    const attemptId = inserted.rows[0].id;

    for (const answer of answerDetails) {
      await client.query(
        `
          INSERT INTO attempt_answers (
            attempt_id,
            question_id,
            question_content,
            selected_option_id,
            selected_option_content,
            correct_option_id,
            correct_option_content,
            is_correct
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          attemptId,
          answer.questionId,
          answer.questionContent,
          answer.selectedOptionId,
          answer.selectedOptionContent,
          answer.correctOptionId,
          answer.correctOptionContent,
          answer.isCorrect
        ]
      );
    }

    return inserted.rows[0];
  });

  return {
    id: attempt.id,
    score,
    total,
    percentage,
    createdAt: attempt.createdAt,
    answers: answerDetails
  };
}

export async function listAttempts(user: AuthUser) {
  const isAdmin = user.role === "admin";
  const result = await dbQuery<AttemptRow>(
    `
      SELECT
        a.id,
        a.user_display_name AS "userDisplayName",
        u.username,
        a.score,
        a.total,
        a.percentage,
        a.created_at AS "createdAt"
      FROM attempts a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE ($1::boolean = true OR a.user_id = $2)
      ORDER BY a.created_at DESC
      LIMIT 30
    `,
    [isAdmin, user.id]
  );

  return result.rows.map((attempt) => ({
    ...attempt,
    percentage: Number(attempt.percentage)
  }));
}

