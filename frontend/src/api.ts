import type { AccountRole, SubjectCode } from "./uiTypes";

export type Role = AccountRole;

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
};

export type PublicOption = {
  id: number;
  label: string;
  content: string;
  isCorrect?: boolean;
};

export type Question = {
  id: number;
  subject: SubjectCode;
  content: string;
  explanation?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  options: PublicOption[];
};

export type StudyLesson = {
  id: number;
  subject: SubjectCode;
  title: string;
  summary: string;
  content: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Account = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeSessions: number;
};

export type AccountSession = {
  id: string;
  deviceId: string;
  userAgent: string | null;
  ipAddress: string | null;
  active: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isOnline: boolean;
};

export type AccountAttempt = {
  id: string;
  score: number;
  total: number;
  percentage: number;
  createdAt: string;
};

export type AccountDetail = {
  account: Account & {
    lastSeenAt: string | null;
    isOnline: boolean;
  };
  sessions: AccountSession[];
  attempts: AccountAttempt[];
};

export type Attempt = {
  id: string;
  userDisplayName: string;
  username: string | null;
  score: number;
  total: number;
  percentage: number;
  createdAt: string;
};

export type ResultAnswer = {
  questionId: number;
  questionContent: string;
  selectedOptionId: number;
  selectedOptionContent: string;
  correctOptionId: number;
  correctOptionContent: string;
  isCorrect: boolean;
};

export type QuizResult = {
  id: string;
  score: number;
  total: number;
  percentage: number;
  createdAt: string;
  answers: ResultAnswer[];
};

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:3000");

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const requestBody: BodyInit | undefined =
    options.body === undefined ? undefined : isFormData ? (options.body as FormData) : JSON.stringify(options.body);
  const headers: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: requestBody
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      data?.code ?? "REQUEST_ERROR",
      data?.message ?? "Không thể kết nối máy chủ",
      data?.errors
    );
  }

  return data as T;
}
