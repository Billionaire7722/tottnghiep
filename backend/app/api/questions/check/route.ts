import { getAuthContext } from "@/src/auth";
import { dbQuery } from "@/src/db";
import { ApiError, errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { answerCheckSchema } from "@/src/validation";

export const runtime = "nodejs";

type CheckedAnswerRow = {
  isCorrect: boolean;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await getAuthContext(request);
    const body = answerCheckSchema.parse(await readJson(request));
    const result = await dbQuery<CheckedAnswerRow>(
      `
        SELECT o.is_correct AS "isCorrect"
        FROM questions q
        JOIN options o ON o.question_id = q.id
        WHERE q.id = $1
          AND o.id = $2
          AND q.is_active = true
        LIMIT 1
      `,
      [body.questionId, body.optionId]
    );
    const answer = result.rows[0];

    if (!answer) {
      throw new ApiError(400, "INVALID_ANSWER", "Đáp án gửi lên không hợp lệ");
    }

    return jsonResponse({ isCorrect: answer.isCorrect }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
