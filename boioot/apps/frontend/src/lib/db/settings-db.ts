import { Pool } from "pg";

// ── Connection pool ────────────────────────────────────────────────────────────
// Uses the same Helium PostgreSQL instance as the .NET backend.
// Env vars: PGHOST, PGPORT, PGDATABASE, PGUSER (all set in Replit + Fly.io).

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host:     process.env.PGHOST     ?? "helium",
      port:     Number(process.env.PGPORT ?? "5432"),
      database: process.env.PGDATABASE ?? "heliumdb",
      user:     process.env.PGUSER     ?? "postgres",
      password: process.env.PGPASSWORD ?? "",
      ssl:      false,
      max:      5,
    });
  }
  return pool;
}

// ── Key names (must match .NET SiteSettingsService) ───────────────────────────

const KEYS = {
  sectionProjectsEnabled:  "section_projects_enabled",
  sectionRequestsEnabled:  "section_requests_enabled",
  sectionDailyRentEnabled: "section_daily_rent_enabled",
  sectionBlogEnabled:      "section_blog_enabled",
} as const;

export interface SiteSettingsRow {
  sectionProjectsEnabled:  boolean;
  sectionRequestsEnabled:  boolean;
  sectionDailyRentEnabled: boolean;
  sectionBlogEnabled:      boolean;
}

// ── Ensure table exists ───────────────────────────────────────────────────────

async function ensureTable(client: import("pg").PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "AppSettings" (
      "Key"         TEXT NOT NULL,
      "Value"       TEXT NOT NULL DEFAULT 'true',
      "Description" TEXT,
      CONSTRAINT "PK_AppSettings" PRIMARY KEY ("Key")
    )
  `);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<SiteSettingsRow> {
  const db = getPool();
  const client = await db.connect();
  try {
    await ensureTable(client);

    const { rows } = await client.query<{ Key: string; Value: string }>(
      `SELECT "Key", "Value" FROM "AppSettings" WHERE "Key" = ANY($1)`,
      [Object.values(KEYS)]
    );

    function get(key: string): boolean {
      const row = rows.find((r) => r.Key === key);
      if (!row) return true;
      return row.Value !== "false";
    }

    // Seed any missing keys
    for (const dbKey of Object.values(KEYS)) {
      if (!rows.find((r) => r.Key === dbKey)) {
        await client.query(
          `INSERT INTO "AppSettings" ("Key", "Value") VALUES ($1, 'true') ON CONFLICT DO NOTHING`,
          [dbKey]
        );
      }
    }

    return {
      sectionProjectsEnabled:  get(KEYS.sectionProjectsEnabled),
      sectionRequestsEnabled:  get(KEYS.sectionRequestsEnabled),
      sectionDailyRentEnabled: get(KEYS.sectionDailyRentEnabled),
      sectionBlogEnabled:      get(KEYS.sectionBlogEnabled),
    };
  } finally {
    client.release();
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function updateSettings(dto: SiteSettingsRow): Promise<SiteSettingsRow> {
  const db = getPool();
  const client = await db.connect();
  try {
    await ensureTable(client);

    const updates: Array<[string, string]> = [
      [KEYS.sectionProjectsEnabled,  dto.sectionProjectsEnabled  ? "true" : "false"],
      [KEYS.sectionRequestsEnabled,  dto.sectionRequestsEnabled  ? "true" : "false"],
      [KEYS.sectionDailyRentEnabled, dto.sectionDailyRentEnabled ? "true" : "false"],
      [KEYS.sectionBlogEnabled,      dto.sectionBlogEnabled      ? "true" : "false"],
    ];

    for (const [key, value] of updates) {
      await client.query(
        `INSERT INTO "AppSettings" ("Key", "Value")
         VALUES ($1, $2)
         ON CONFLICT ("Key") DO UPDATE SET "Value" = EXCLUDED."Value"`,
        [key, value]
      );
    }

    return getSettings();
  } finally {
    client.release();
  }
}
