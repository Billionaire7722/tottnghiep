import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { dbQuery, ensureDatabase, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import { canManageAccounts, canManageQuestions, isRole, type Role } from "@/src/roles";
import type { z } from "zod";
import type { loginSchema } from "@/src/validation";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
};

export type AuthContext = {
  user: AuthUser;
  sessionId: string;
};

type UserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
};

type SessionRecord = AuthUser & {
  sessionActive: boolean;
  replacedBy: string | null;
  expiresAt: Date | string;
};

type TokenPayload = jwt.JwtPayload & {
  sub: string;
  sid: string;
  role: Role;
  username: string;
};

const tokenTtlHours = 8;
const tokenTtlMs = tokenTtlHours * 60 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export async function loginUser(input: z.infer<typeof loginSchema>, request: Request) {
  await ensureDatabase();
  assertLoginAllowed(input.username, request);

  const result = await dbQuery<UserRecord>(
    `
      SELECT
        id,
        username,
        display_name AS "displayName",
        password_hash AS "passwordHash",
        role,
        is_active AS "isActive"
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [input.username]
  );
  const user = result.rows[0];
  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;

  if (!user || !passwordOk || !user.isActive) {
    registerLoginFailure(input.username, request);
    throw new ApiError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng");
  }

  registerLoginSuccess(input.username, request);

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + tokenTtlMs);
  const deviceId = input.deviceId ?? randomUUID();
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const ipAddress = getClientIp(request);

  await withTransaction(async (client) => {
    await client.query(
      `
        INSERT INTO sessions (id, user_id, device_id, user_agent, ip_address, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [sessionId, user.id, deviceId, userAgent, ipAddress, expiresAt]
    );

    if (user.role !== "admin") {
      await client.query(
        `
          UPDATE sessions
          SET active = false,
              revoked_at = now(),
              replaced_by = $1
          WHERE user_id = $2
            AND id <> $1
            AND active = true
        `,
        [sessionId, user.id]
      );
    }
  });

  const safeUser = toSafeUser(user);

  return {
    token: issueToken(safeUser, sessionId),
    expiresAt: expiresAt.toISOString(),
    user: safeUser
  };
}

export async function getAuthContext(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request);
  const payload = verifyToken(token);

  const result = await dbQuery<SessionRecord>(
    `
      SELECT
        u.id,
        u.username,
        u.display_name AS "displayName",
        u.role,
        u.is_active AS "isActive",
        s.active AS "sessionActive",
        s.replaced_by AS "replacedBy",
        s.expires_at AS "expiresAt"
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [payload.sid]
  );
  const row = result.rows[0];

  if (!row) {
    throw new ApiError(401, "SESSION_EXPIRED", "Phiên đăng nhập không còn hiệu lực");
  }

  const expired = new Date(row.expiresAt).getTime() <= Date.now();

  if (!row.sessionActive || expired || !row.isActive) {
    const code = row.replacedBy ? "SESSION_REPLACED" : "SESSION_EXPIRED";
    const message = row.replacedBy
      ? "Tài khoản đã đăng nhập ở thiết bị khác. Phiên hiện tại đã bị đăng xuất"
      : "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại";

    throw new ApiError(401, code, message);
  }

  await dbQuery("UPDATE sessions SET last_seen_at = now() WHERE id = $1", [payload.sid]);

  return {
    sessionId: payload.sid,
    user: {
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      role: row.role,
      isActive: row.isActive
    }
  };
}

export async function requireAdmin(request: Request) {
  const context = await getAuthContext(request);

  if (!canManageAccounts(context.user.role)) {
    throw new ApiError(403, "ADMIN_ONLY", "Chỉ quản trị viên mới có quyền thực hiện thao tác này");
  }

  return context;
}

export async function requireQuestionManager(request: Request) {
  const context = await getAuthContext(request);

  if (!canManageQuestions(context.user.role)) {
    throw new ApiError(403, "QUESTION_MANAGER_ONLY", "Chỉ quản trị viên hoặc người chỉnh sửa mới có quyền quản trị câu hỏi");
  }

  return context;
}

export async function logoutSession(request: Request) {
  const token = getBearerToken(request);
  const payload = verifyToken(token);

  await dbQuery(
    `
      UPDATE sessions
      SET active = false,
          revoked_at = now()
      WHERE id = $1
    `,
    [payload.sid]
  );
}

function issueToken(user: AuthUser, sessionId: string) {
  return jwt.sign(
    {
      sid: sessionId,
      role: user.role,
      username: user.username
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: `${tokenTtlHours}h`
    }
  );
}

function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (!isTokenPayload(decoded)) {
      throw new ApiError(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ");
    }

    return decoded;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, "TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn");
    }

    throw new ApiError(401, "INVALID_TOKEN", "Phiên đăng nhập không hợp lệ");
  }
}

function isTokenPayload(decoded: string | jwt.JwtPayload): decoded is TokenPayload {
  return (
    typeof decoded !== "string" &&
    typeof decoded.sub === "string" &&
    typeof decoded.sid === "string" &&
    isRole(decoded.role) &&
    typeof decoded.username === "string"
  );
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    throw new ApiError(401, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục");
  }

  return token;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "dev_only_change_this_secret_before_production";

  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new ApiError(500, "WEAK_SECRET", "JWT_SECRET cần có ít nhất 32 ký tự");
  }

  return secret;
}

function toSafeUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive
  };
}

function assertLoginAllowed(username: string, request: Request) {
  const key = loginAttemptKey(username, request);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    return;
  }

  if (entry.count >= 10) {
    throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Bạn thử đăng nhập quá nhiều lần, vui lòng chờ ít phút");
  }
}

function registerLoginFailure(username: string, request: Request) {
  const key = loginAttemptKey(username, request);
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }

  entry.count += 1;
}

function registerLoginSuccess(username: string, request: Request) {
  loginAttempts.delete(loginAttemptKey(username, request));
}

function loginAttemptKey(username: string, request: Request) {
  return `${getClientIp(request)}:${username}`;
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
