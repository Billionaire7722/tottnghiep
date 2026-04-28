import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { ApiError, corsHeaders } from "@/src/http";
import { isSubjectCode, type SubjectCode } from "@/src/subjects";

export type StudySlide = {
  id: string;
  subject: SubjectCode;
  title: string;
  fileName: string;
  size: number;
  updatedAt: string;
  viewUrl: string;
  downloadUrl: string;
};

type SlideFile = {
  absolutePath: string;
  fileName: string;
  size: number;
  mtime: Date;
};

type SlideCacheEntry = {
  expiresAt: number;
  slides: StudySlide[];
};

const subjectFolders: Record<SubjectCode, string> = {
  dich_te: "dịch tễ",
  suc_khoe_nghe_nghiep: "sức khỏe nghề nghiệp",
  dinh_duong: "dinh dưỡng",
  suc_khoe_moi_truong: "sức khỏe môi trường"
};

const cacheTtlMs = 60_000;
const slideCache = new Map<SubjectCode, SlideCacheEntry>();
const viCollator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

export async function listSlides(subject?: SubjectCode | null) {
  const subjects = subject ? [subject] : (Object.keys(subjectFolders) as SubjectCode[]);
  const groups = await Promise.all(subjects.map((subjectCode) => listSubjectSlides(subjectCode)));

  return groups.flat();
}

export async function getSlideFileForAccess(subject: string, filePath: string[]) {
  if (!isSubjectCode(subject)) {
    throw new ApiError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide");
  }

  if (!filePath.length || filePath.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new ApiError(400, "INVALID_SLIDE_PATH", "Đường dẫn slide không hợp lệ");
  }

  const subjectRoot = await resolveSubjectRoot(subject);
  const absolutePath = path.resolve(subjectRoot, ...filePath);

  if (!absolutePath.startsWith(`${subjectRoot}${path.sep}`)) {
    throw new ApiError(400, "INVALID_SLIDE_PATH", "Đường dẫn slide không hợp lệ");
  }

  if (path.extname(absolutePath).toLowerCase() !== ".pdf") {
    throw new ApiError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide");
  }

  const fileStat = await stat(absolutePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw new ApiError(404, "SLIDE_NOT_FOUND", "Không tìm thấy slide");
  }

  return {
    absolutePath,
    fileName: filePath[filePath.length - 1],
    size: fileStat.size,
    mtime: fileStat.mtime
  } satisfies SlideFile;
}

export async function buildSlideResponse(request: Request, slide: SlideFile, disposition: "inline" | "attachment") {
  const range = request.headers.get("range");
  const etag = makeEtag(slide);
  const baseHeaders = {
    ...corsHeaders(request),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "Content-Disposition": contentDisposition(slide.fileName, disposition),
    "Content-Type": "application/pdf",
    "ETag": etag,
    "Last-Modified": slide.mtime.toUTCString()
  };

  if (!range && request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: baseHeaders
    });
  }

  if (range) {
    const parsed = parseRange(range, slide.size);

    if (parsed) {
      const { start, end } = parsed;
      const stream = Readable.toWeb(createReadStream(slide.absolutePath, { start, end })) as ReadableStream;

      return new Response(stream, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${slide.size}`
        }
      });
    }
  }

  const stream = Readable.toWeb(createReadStream(slide.absolutePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      ...baseHeaders,
      "Content-Length": String(slide.size)
    }
  });
}

async function listSubjectSlides(subject: SubjectCode) {
  const cached = slideCache.get(subject);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.slides;
  }

  const subjectRoot = await resolveSubjectRoot(subject).catch(() => null);

  if (!subjectRoot) {
    slideCache.set(subject, { expiresAt: Date.now() + cacheTtlMs, slides: [] });
    return [];
  }

  const relativeFiles = await listPdfFiles(subjectRoot);
  const slides = await Promise.all(
    relativeFiles.map(async (segments) => {
      const absolutePath = path.join(subjectRoot, ...segments);
      const fileStat = await stat(absolutePath);
      const encodedPath = segments.map(encodeURIComponent).join("/");
      const viewUrl = `/api/slides/${subject}/${encodedPath}`;
      const fileName = segments[segments.length - 1];

      return {
        id: `${subject}/${segments.join("/")}`,
        subject,
        title: titleFromFileName(fileName),
        fileName,
        size: fileStat.size,
        updatedAt: fileStat.mtime.toISOString(),
        viewUrl,
        downloadUrl: `${viewUrl}?download=1`
      } satisfies StudySlide;
    })
  );

  slides.sort((left, right) => viCollator.compare(left.title, right.title));
  slideCache.set(subject, { expiresAt: Date.now() + cacheTtlMs, slides });

  return slides;
}

async function listPdfFiles(directory: string, parents: string[] = []): Promise<string[][]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const segments = [...parents, entry.name];
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listPdfFiles(absolutePath, segments);
      }

      return entry.isFile() && path.extname(entry.name).toLowerCase() === ".pdf" ? [segments] : [];
    })
  );

  return files.flat();
}

async function resolveSubjectRoot(subject: SubjectCode) {
  const slideRoot = await resolveSlideRoot();
  const subjectRoot = path.resolve(slideRoot, subjectFolders[subject]);

  if (!subjectRoot.startsWith(`${slideRoot}${path.sep}`)) {
    throw new ApiError(400, "INVALID_SLIDE_ROOT", "Thư mục slide không hợp lệ");
  }

  return subjectRoot;
}

async function resolveSlideRoot() {
  const candidates = [
    process.env.SLIDE_DIR,
    path.join(process.cwd(), "slide"),
    path.join(process.cwd(), "..", "slide")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(candidate);
    const fileStat = await stat(absolutePath).catch(() => null);

    if (fileStat?.isDirectory()) {
      return absolutePath;
    }
  }

  throw new ApiError(404, "SLIDE_ROOT_NOT_FOUND", "Không tìm thấy thư mục slide");
}

function titleFromFileName(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

function parseRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);

  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  let start: number;
  let end: number;

  if (!match[1]) {
    const suffixLength = Number(match[2]);

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }

    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= size) {
    return null;
  }

  return { start, end };
}

function makeEtag(slide: SlideFile) {
  return `"slide-${slide.size}-${Math.trunc(slide.mtime.getTime())}"`;
}

function contentDisposition(fileName: string, disposition: "inline" | "attachment") {
  return `${disposition}; filename="${fallbackAsciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function fallbackAsciiFileName(fileName: string) {
  return fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "_");
}
