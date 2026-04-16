export type Role = "admin" | "user";

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
  content: string;
  explanation?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  options: PublicOption[];
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
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
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
