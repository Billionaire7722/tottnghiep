import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { dbQuery, withTransaction } from "@/src/db";
import { ApiError } from "@/src/http";
import type { AccountCreateInput, AccountUpdateInput } from "@/src/validation";

type AccountRow = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  activeSessions: string;
};

type ExistingAccount = {
  id: string;
  role: "admin" | "user";
  isActive: boolean;
};

export async function listAccounts() {
  const result = await dbQuery<AccountRow>(`
    SELECT
      u.id,
      u.username,
      u.display_name AS "displayName",
      u.role,
      u.is_active AS "isActive",
      u.created_at AS "createdAt",
      u.updated_at AS "updatedAt",
      COUNT(s.id) FILTER (WHERE s.active = true AND s.expires_at > now()) AS "activeSessions"
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY
      CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END,
      u.username ASC
  `);

  return result.rows.map((account) => ({
    ...account,
    activeSessions: Number(account.activeSessions)
  }));
}

export async function createAccount(input: AccountCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const result = await dbQuery<Omit<AccountRow, "activeSessions">>(
      `
        INSERT INTO users (username, display_name, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          username,
          display_name AS "displayName",
          role,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [input.username, input.displayName, passwordHash, input.role, input.isActive]
    );

    return { ...result.rows[0], activeSessions: 0 };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "USERNAME_EXISTS", "Tên đăng nhập đã tồn tại");
    }

    throw error;
  }
}

export async function updateAccount(id: string, input: AccountUpdateInput) {
  return withTransaction(async (client) => {
    const existing = await getExistingAccount(client, id);
    const nextRole = input.role ?? existing.role;
    const nextIsActive = input.isActive ?? existing.isActive;

    if (existing.role === "admin" && (nextRole !== "admin" || !nextIsActive)) {
      await assertAnotherActiveAdmin(client, id);
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.displayName !== undefined) {
      params.push(input.displayName);
      updates.push(`display_name = $${params.length}`);
    }

    if (input.role !== undefined) {
      params.push(input.role);
      updates.push(`role = $${params.length}`);
    }

    if (input.isActive !== undefined) {
      params.push(input.isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (input.password) {
      params.push(await bcrypt.hash(input.password, 12));
      updates.push(`password_hash = $${params.length}`);
    }

    if (updates.length === 0) {
      throw new ApiError(400, "NO_UPDATE_DATA", "Không có dữ liệu cần cập nhật");
    }

    updates.push("updated_at = now()");
    params.push(id);

    const result = await client.query<Omit<AccountRow, "activeSessions">>(
      `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = $${params.length}
        RETURNING
          id,
          username,
          display_name AS "displayName",
          role,
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      params
    );

    if (!nextIsActive) {
      await client.query(
        `
          UPDATE sessions
          SET active = false,
              revoked_at = now()
          WHERE user_id = $1
            AND active = true
        `,
        [id]
      );
    }

    return { ...result.rows[0], activeSessions: 0 };
  });
}

export async function deleteAccount(id: string, actorId: string) {
  if (id === actorId) {
    throw new ApiError(400, "CANNOT_DELETE_SELF", "Không thể xóa chính tài khoản đang đăng nhập");
  }

  await withTransaction(async (client) => {
    const existing = await getExistingAccount(client, id);

    if (existing.role === "admin" && existing.isActive) {
      await assertAnotherActiveAdmin(client, id);
    }

    await client.query("DELETE FROM users WHERE id = $1", [id]);
  });
}

async function getExistingAccount(client: PoolClient, id: string) {
  const result = await client.query<ExistingAccount>(
    `
      SELECT id, role, is_active AS "isActive"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!result.rows[0]) {
    throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản");
  }

  return result.rows[0];
}

async function assertAnotherActiveAdmin(client: PoolClient, id: string) {
  const result = await client.query<{ count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'admin'
        AND is_active = true
        AND id <> $1
    `,
    [id]
  );

  if (Number(result.rows[0]?.count ?? 0) === 0) {
    throw new ApiError(400, "LAST_ADMIN", "Cần giữ lại ít nhất một tài khoản admin đang hoạt động");
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

