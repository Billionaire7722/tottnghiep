import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { dbQuery } from "@/src/db";
import { ApiError, corsHeaders } from "@/src/http";
import type { Role } from "@/src/roles";
import { canManageQuestions } from "@/src/roles";
import type { SubjectCode } from "@/src/subjects";
import type { StudyLessonInput } from "@/src/validation";

export type StudyLessonAttachment = {
  id: string;
  lessonId: number;
  fileName: string;
  mimeType: string;
  size: number;
  kind: StudyLessonAttachmentKind;
  createdAt: string;
};

type StudyLessonAttachmentKind = "image" | "video" | "audio" | "pdf" | "document" | "file";

type StudyLessonAttachmentRecord = StudyLessonAttachment & {
  storageKey: string;
  isLessonActive: boolean;
};

type StudyLessonRow = {
  id: number;
  subject: SubjectCode;
  title: string;
  summary: string;
  content: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  attachments: unknown;
};

type AttachmentRow = {
  id: string;
  lessonId: number;
  fileName: string;
  mimeType: string;
  size: string | number;
  kind: StudyLessonAttachmentKind;
  storageKey: string;
  isLessonActive: boolean;
  createdAt: Date | string;
};

const maxUploadBytes = 100 * 1024 * 1024;
const allowedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mp3",
  ".wav",
  ".m4a",
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx"
]);

const exactMimeKinds = new Map<string, StudyLessonAttachmentKind>([
  ["application/pdf", "pdf"],
  ["text/plain", "document"],
  ["text/markdown", "document"],
  ["application/msword", "document"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
  ["application/vnd.ms-powerpoint", "document"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "document"],
  ["application/vnd.ms-excel", "document"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "document"]
]);

export async function listStudyLessons(includeInactive: boolean, subject?: SubjectCode | null) {
  const result = await dbQuery<StudyLessonRow>(
    `
      SELECT
        sl.id,
        sl.subject,
        sl.title,
        sl.summary,
        sl.content,
        sl.is_active AS "isActive",
        sl.created_at AS "createdAt",
        sl.updated_at AS "updatedAt",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'lessonId', a.lesson_id,
                'fileName', a.file_name,
                'mimeType', a.mime_type,
                'size', a.file_size,
                'kind', a.kind,
                'createdAt', a.created_at
              )
              ORDER BY a.created_at ASC, a.file_name ASC
            )
            FROM study_lesson_attachments a
            WHERE a.lesson_id = sl.id
          ),
          '[]'::json
        ) AS attachments
      FROM study_lessons sl
      WHERE ($1::boolean = true OR sl.is_active = true)
        AND ($2::text IS NULL OR sl.subject = $2)
      ORDER BY sl.subject ASC, sl.created_at DESC, sl.id DESC
    `,
    [includeInactive, subject ?? null]
  );

  return result.rows.map(mapStudyLesson);
}

export async function getStudyLesson(id: number, includeInactive: boolean) {
  const result = await dbQuery<StudyLessonRow>(
    `
      SELECT
        sl.id,
        sl.subject,
        sl.title,
        sl.summary,
        sl.content,
        sl.is_active AS "isActive",
        sl.created_at AS "createdAt",
        sl.updated_at AS "updatedAt",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'lessonId', a.lesson_id,
                'fileName', a.file_name,
                'mimeType', a.mime_type,
                'size', a.file_size,
                'kind', a.kind,
                'createdAt', a.created_at
              )
              ORDER BY a.created_at ASC, a.file_name ASC
            )
            FROM study_lesson_attachments a
            WHERE a.lesson_id = sl.id
          ),
          '[]'::json
        ) AS attachments
      FROM study_lessons sl
      WHERE sl.id = $1
        AND ($2::boolean = true OR sl.is_active = true)
      LIMIT 1
    `,
    [id, includeInactive]
  );

  const lesson = result.rows[0];

  if (!lesson) {
    throw new ApiError(404, "STUDY_LESSON_NOT_FOUND", "Không tìm thấy bài ôn tập");
  }

  return mapStudyLesson(lesson);
}

export async function createStudyLesson(input: StudyLessonInput, adminId: string) {
  const result = await dbQuery<{ id: number }>(
    `
      INSERT INTO study_lessons (subject, title, summary, content, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [input.subject, input.title, input.summary ?? "", input.content ?? "", input.isActive ?? true, adminId]
  );

  return getStudyLesson(result.rows[0].id, true);
}

export async function updateStudyLesson(id: number, input: StudyLessonInput) {
  const result = await dbQuery<{ id: number }>(
    `
      UPDATE study_lessons
      SET subject = $1,
          title = $2,
          summary = $3,
          content = $4,
          is_active = $5,
          updated_at = now()
      WHERE id = $6
      RETURNING id
    `,
    [input.subject, input.title, input.summary ?? "", input.content ?? "", input.isActive ?? true, id]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "STUDY_LESSON_NOT_FOUND", "Không tìm thấy bài ôn tập");
  }

  return getStudyLesson(id, true);
}

export async function deleteStudyLesson(id: number) {
  const attachments = await listAttachmentRecordsForLesson(id);
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

  await Promise.all(attachments.map((attachment) => removeAttachmentFile(attachment.storageKey)));
}

export async function saveStudyLessonAttachment(lessonId: number, file: File, adminId: string) {
  if (!file.name || file.size <= 0) {
    throw new ApiError(400, "INVALID_FILE", "File tải lên không hợp lệ");
  }

  if (file.size > maxUploadBytes) {
    throw new ApiError(413, "FILE_TOO_LARGE", "File tối đa 100MB");
  }

  const originalName = sanitizeFileName(file.name);
  const extension = path.extname(originalName).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    throw new ApiError(400, "UNSUPPORTED_FILE_TYPE", "Định dạng file này chưa được hỗ trợ");
  }

  const mimeType = normalizeMimeType(file.type, extension);
  const kind = inferAttachmentKind(mimeType, extension);

  await ensureStudyLessonExistsForManager(lessonId);

  const uploadDirectory = await ensureUploadDirectory();
  const storageKey = `${randomUUID()}${extension || ".bin"}`;
  const absolutePath = path.join(uploadDirectory, storageKey);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer, { flag: "wx" });

  try {
    const result = await dbQuery<AttachmentRow>(
      `
        INSERT INTO study_lesson_attachments (lesson_id, file_name, mime_type, file_size, kind, storage_key, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          lesson_id AS "lessonId",
          file_name AS "fileName",
          mime_type AS "mimeType",
          file_size AS "size",
          kind,
          storage_key AS "storageKey",
          true AS "isLessonActive",
          created_at AS "createdAt"
      `,
      [lessonId, originalName, mimeType, file.size, kind, storageKey, adminId]
    );

    return toPublicAttachment(result.rows[0]);
  } catch (error) {
    await removeAttachmentFile(storageKey);
    throw error;
  }
}

export async function deleteStudyLessonAttachment(lessonId: number, attachmentId: string) {
  const result = await dbQuery<AttachmentRow>(
    `
      DELETE FROM study_lesson_attachments
      WHERE id = $1
        AND lesson_id = $2
      RETURNING
        id,
        lesson_id AS "lessonId",
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "size",
        kind,
        storage_key AS "storageKey",
        true AS "isLessonActive",
        created_at AS "createdAt"
    `,
    [attachmentId, lessonId]
  );

  const attachment = result.rows[0];

  if (!attachment) {
    throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Không tìm thấy file đính kèm");
  }

  await removeAttachmentFile(attachment.storageKey);
}

export async function getAttachmentForAccess(lessonId: number, attachmentId: string, role?: Role | null) {
  const result = await dbQuery<AttachmentRow>(
    `
      SELECT
        a.id,
        a.lesson_id AS "lessonId",
        a.file_name AS "fileName",
        a.mime_type AS "mimeType",
        a.file_size AS "size",
        a.kind,
        a.storage_key AS "storageKey",
        sl.is_active AS "isLessonActive",
        a.created_at AS "createdAt"
      FROM study_lesson_attachments a
      JOIN study_lessons sl ON sl.id = a.lesson_id
      WHERE a.id = $1
        AND a.lesson_id = $2
      LIMIT 1
    `,
    [attachmentId, lessonId]
  );

  const attachment = result.rows[0];

  if (!attachment || (!attachment.isLessonActive && (!role || !canManageQuestions(role)))) {
    throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Không tìm thấy file đính kèm");
  }

  return {
    ...toPublicAttachment(attachment),
    storageKey: attachment.storageKey,
    isLessonActive: attachment.isLessonActive
  } satisfies StudyLessonAttachmentRecord;
}

export async function buildAttachmentResponse(request: Request, attachment: StudyLessonAttachmentRecord) {
  const absolutePath = resolveAttachmentPath(attachment.storageKey);
  const fileStat = await stat(absolutePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw new ApiError(404, "ATTACHMENT_FILE_MISSING", "File đính kèm không còn tồn tại");
  }

  const baseHeaders = {
    ...corsHeaders(request),
    "Accept-Ranges": "bytes",
    "Content-Type": attachment.mimeType,
    "Content-Disposition": contentDisposition(attachment.fileName)
  };
  const range = request.headers.get("range");

  if (range) {
    const parsed = parseRange(range, fileStat.size);

    if (parsed) {
      const { start, end } = parsed;
      const stream = Readable.toWeb(createReadStream(absolutePath, { start, end })) as ReadableStream;

      return new Response(stream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`
        }
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      ...baseHeaders,
      "Content-Length": String(fileStat.size)
    }
  });
}

function mapStudyLesson(row: StudyLessonRow) {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    summary: row.summary,
    content: row.content,
    isActive: row.isActive,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    attachments: parseAttachments(row.attachments)
  };
}

function parseAttachments(value: unknown): StudyLessonAttachment[] {
  const items = typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) =>
    toPublicAttachment({
      ...item,
      storageKey: "",
      isLessonActive: true
    } as AttachmentRow)
  );
}

function toPublicAttachment(row: AttachmentRow): StudyLessonAttachment {
  return {
    id: row.id,
    lessonId: row.lessonId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    size: Number(row.size),
    kind: row.kind,
    createdAt: toIsoString(row.createdAt)
  };
}

async function ensureStudyLessonExistsForManager(lessonId: number) {
  const result = await dbQuery<{ id: number }>("SELECT id FROM study_lessons WHERE id = $1 LIMIT 1", [lessonId]);

  if (!result.rows[0]) {
    throw new ApiError(404, "STUDY_LESSON_NOT_FOUND", "Không tìm thấy bài ôn tập");
  }
}

async function listAttachmentRecordsForLesson(lessonId: number) {
  const result = await dbQuery<AttachmentRow>(
    `
      SELECT
        id,
        lesson_id AS "lessonId",
        file_name AS "fileName",
        mime_type AS "mimeType",
        file_size AS "size",
        kind,
        storage_key AS "storageKey",
        true AS "isLessonActive",
        created_at AS "createdAt"
      FROM study_lesson_attachments
      WHERE lesson_id = $1
    `,
    [lessonId]
  );

  return result.rows;
}

async function ensureUploadDirectory() {
  const directory = path.join(getUploadRoot(), "study-lessons");
  await mkdir(directory, { recursive: true });
  return directory;
}

function getUploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"));
}

function resolveAttachmentPath(storageKey: string) {
  const root = path.join(getUploadRoot(), "study-lessons");
  const absolutePath = path.resolve(root, storageKey);

  if (!absolutePath.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new ApiError(400, "INVALID_ATTACHMENT_PATH", "Đường dẫn file không hợp lệ");
  }

  return absolutePath;
}

function removeAttachmentFile(storageKey: string) {
  return unlink(resolveAttachmentPath(storageKey)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
  });
}

function sanitizeFileName(value: string) {
  const normalized = value.normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim();
  return (normalized || "tai-lieu").slice(0, 180);
}

function normalizeMimeType(mimeType: string, extension: string) {
  if (mimeType && (mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/"))) {
    return mimeType;
  }

  if (exactMimeKinds.has(mimeType)) {
    return mimeType;
  }

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if ([".txt", ".md"].includes(extension)) {
    return "text/plain";
  }

  return mimeType || "application/octet-stream";
}

function inferAttachmentKind(mimeType: string, extension: string): StudyLessonAttachmentKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (mimeType === "application/pdf" || extension === ".pdf") {
    return "pdf";
  }

  if (exactMimeKinds.has(mimeType) || [".txt", ".md", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"].includes(extension)) {
    return "document";
  }

  return "file";
}

function parseRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);

  if (!match) {
    return null;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= size) {
    return null;
  }

  return { start, end };
}

function contentDisposition(fileName: string) {
  return `inline; filename="${fallbackAsciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function fallbackAsciiFileName(fileName: string) {
  return fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "_");
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
