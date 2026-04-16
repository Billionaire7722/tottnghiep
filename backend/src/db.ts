import bcrypt from "bcryptjs";
import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  // Keep a single pool during Next.js hot reloads.
  // eslint-disable-next-line no-var
  var __cnxhPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __cnxhInitPromise: Promise<void> | undefined;
}

const fallbackDatabaseUrl = "postgres://cnxh:cnxh_password@localhost:5432/cnxh_db";

export const pool =
  globalThis.__cnxhPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
    max: 10
  });

if (!globalThis.__cnxhPool) {
  globalThis.__cnxhPool = pool;
}

export async function ensureDatabase() {
  if (!globalThis.__cnxhInitPromise) {
    globalThis.__cnxhInitPromise = initializeDatabase();
  }

  return globalThis.__cnxhInitPromise;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureDatabase();
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  await ensureDatabase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE NOT NULL,
      display_name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id text NOT NULL,
      user_agent text,
      ip_address text,
      active boolean NOT NULL DEFAULT true,
      replaced_by uuid REFERENCES sessions(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS sessions_user_active_idx
    ON sessions (user_id, active)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id serial PRIMARY KEY,
      content text NOT NULL,
      explanation text,
      is_active boolean NOT NULL DEFAULT true,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS options (
      id serial PRIMARY KEY,
      question_id integer NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      label text NOT NULL,
      content text NOT NULL,
      is_correct boolean NOT NULL DEFAULT false
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS options_question_idx
    ON options (question_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      user_display_name text NOT NULL,
      score integer NOT NULL,
      total integer NOT NULL,
      percentage numeric(5, 2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attempt_answers (
      id bigserial PRIMARY KEY,
      attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id integer NOT NULL,
      question_content text NOT NULL,
      selected_option_id integer,
      selected_option_content text,
      correct_option_id integer NOT NULL,
      correct_option_content text NOT NULL,
      is_correct boolean NOT NULL
    )
  `);

  await seedAdmin();
  await seedQuestions();
}

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const displayName = (process.env.ADMIN_DISPLAY_NAME ?? "Quản trị viên").trim();
  const password = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `
      INSERT INTO users (username, display_name, password_hash, role, is_active)
      VALUES ($1, $2, $3, 'admin', true)
      ON CONFLICT (username) DO NOTHING
    `,
    [username, displayName || "Quản trị viên", passwordHash]
  );
}

async function seedQuestions() {
  const existing = await pool.query<{ count: string }>("SELECT COUNT(*) FROM questions");

  if (Number(existing.rows[0]?.count ?? 0) > 0) {
    return;
  }

  const admin = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
  );
  const adminId = admin.rows[0]?.id ?? null;

  const sampleQuestions = [
    {
      content: "Chủ nghĩa xã hội khoa học nghiên cứu vấn đề trọng tâm nào?",
      explanation:
        "Môn học tập trung vào quy luật ra đời, phát triển của hình thái kinh tế - xã hội cộng sản chủ nghĩa và vai trò lịch sử của giai cấp công nhân.",
      options: [
        ["A", "Quy luật tự nhiên của sinh giới", false],
        ["B", "Quy luật chính trị - xã hội của quá trình chuyển biến lên chủ nghĩa xã hội", true],
        ["C", "Kỹ thuật quản trị doanh nghiệp", false],
        ["D", "Lịch sử các triều đại phong kiến", false]
      ]
    },
    {
      content: "Sứ mệnh lịch sử của giai cấp công nhân theo chủ nghĩa Mác - Lênin là gì?",
      explanation:
        "Giai cấp công nhân có sứ mệnh lãnh đạo quá trình xóa bỏ chủ nghĩa tư bản và xây dựng xã hội mới.",
      options: [
        ["A", "Duy trì nguyên trạng quan hệ sản xuất tư bản chủ nghĩa", false],
        ["B", "Xây dựng xã hội xã hội chủ nghĩa và cộng sản chủ nghĩa", true],
        ["C", "Chỉ đấu tranh vì quyền lợi cá nhân", false],
        ["D", "Tách khỏi mọi phong trào xã hội", false]
      ]
    },
    {
      content: "Điều kiện khách quan quy định sứ mệnh lịch sử của giai cấp công nhân là gì?",
      explanation:
        "Địa vị kinh tế - xã hội trong nền sản xuất công nghiệp hiện đại là nền tảng khách quan của sứ mệnh này.",
      options: [
        ["A", "Địa vị trong nền sản xuất công nghiệp hiện đại", true],
        ["B", "Sở hữu phần lớn ruộng đất", false],
        ["C", "Không liên hệ với lực lượng sản xuất", false],
        ["D", "Chỉ tồn tại trong xã hội cổ đại", false]
      ]
    },
    {
      content: "Liên minh giai cấp công nhân với giai cấp nông dân và tầng lớp trí thức có ý nghĩa gì?",
      explanation:
        "Liên minh này tạo nền tảng chính trị - xã hội rộng rãi cho quá trình xây dựng chủ nghĩa xã hội.",
      options: [
        ["A", "Làm suy yếu khối đại đoàn kết dân tộc", false],
        ["B", "Tạo nền tảng chính trị - xã hội của thời kỳ quá độ", true],
        ["C", "Loại bỏ vai trò của nhà nước", false],
        ["D", "Chỉ phục vụ hoạt động thương mại", false]
      ]
    },
    {
      content: "Dân chủ xã hội chủ nghĩa có đặc trưng cơ bản nào?",
      explanation:
        "Dân chủ xã hội chủ nghĩa hướng tới quyền làm chủ của nhân dân trên các lĩnh vực đời sống xã hội.",
      options: [
        ["A", "Quyền lực thuộc về thiểu số đặc quyền", false],
        ["B", "Nhân dân là chủ thể quyền lực", true],
        ["C", "Không cần pháp luật", false],
        ["D", "Chỉ tồn tại trong phạm vi kinh tế tư nhân", false]
      ]
    },
    {
      content: "Nhà nước xã hội chủ nghĩa mang bản chất của giai cấp nào?",
      explanation:
        "Nhà nước xã hội chủ nghĩa mang bản chất giai cấp công nhân, đồng thời có tính nhân dân và tính dân tộc sâu sắc.",
      options: [
        ["A", "Giai cấp công nhân", true],
        ["B", "Giai cấp chủ nô", false],
        ["C", "Giai cấp địa chủ phong kiến", false],
        ["D", "Tầng lớp tư sản độc quyền", false]
      ]
    },
    {
      content: "Thời kỳ quá độ lên chủ nghĩa xã hội là gì?",
      explanation:
        "Đây là giai đoạn cải biến cách mạng toàn diện từ xã hội cũ sang xã hội xã hội chủ nghĩa.",
      options: [
        ["A", "Giai đoạn không có biến đổi xã hội", false],
        ["B", "Giai đoạn cải biến từ xã hội cũ sang xã hội xã hội chủ nghĩa", true],
        ["C", "Giai đoạn quay lại chế độ chiếm hữu nô lệ", false],
        ["D", "Một hiện tượng thuần túy sinh học", false]
      ]
    },
    {
      content: "Đảng Cộng sản có vai trò nào đối với giai cấp công nhân?",
      explanation:
        "Đảng Cộng sản là đội tiên phong chính trị, tổ chức và lãnh đạo giai cấp công nhân thực hiện sứ mệnh lịch sử.",
      options: [
        ["A", "Đội tiên phong chính trị của giai cấp công nhân", true],
        ["B", "Một tổ chức không có mục tiêu chính trị", false],
        ["C", "Cơ quan thay thế toàn bộ nhân dân", false],
        ["D", "Tổ chức chỉ hoạt động trong lĩnh vực giải trí", false]
      ]
    }
  ];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const question of sampleQuestions) {
      const inserted = await client.query<{ id: number }>(
        `
          INSERT INTO questions (content, explanation, created_by)
          VALUES ($1, $2, $3)
          RETURNING id
        `,
        [question.content, question.explanation, adminId]
      );

      const questionId = inserted.rows[0].id;

      for (const option of question.options) {
        await client.query(
          `
            INSERT INTO options (question_id, label, content, is_correct)
            VALUES ($1, $2, $3, $4)
          `,
          [questionId, option[0], option[1], option[2]]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

