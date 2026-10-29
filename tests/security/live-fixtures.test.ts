import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { liveFixture, provisionLiveFixtures } from "../../scripts/live-fixtures";
import { isUuid } from "../../src/server/security";

test("live demo provisioning is additive, idempotent and rolls back mismatches", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')::uuid $$;`);
    await db.exec(await readFile("prisma/bootstrap.sql", "utf8"));
    await db.exec("SET ROLE sanayipro_migrator");
    await db.exec(await readFile("prisma/migrations/202610220001_tenant_foundation/migration.sql", "utf8"));
    await db.exec("RESET ROLE");
    const ids = ["00000000-0000-0000-0000-000000000101", "00000000-0000-0000-0000-000000000102", "00000000-0000-0000-0000-000000000103"];
    for (const id of ids) await db.query("INSERT INTO auth.users(id) VALUES ($1)", [id]);
    await db.exec("SET ROLE sanayipro_migrator");
    const connection = { query: async (sql: string, values?: unknown[]) => {
      const r = await db.query<Record<string, unknown>>(sql, values);
      return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
    } };
    const a = liveFixture(ids[0], "A"), b = liveFixture(ids[1], "B");
    assert.deepEqual(liveFixture(ids[0], "A"), a);
    assert.notEqual(a.organizationId, b.organizationId);
    assert.ok([a.organizationId,a.branchId,a.roleId,a.unassignedBranchId].every(isUuid));
    await provisionLiveFixtures(connection, [a, b]);
    await provisionLiveFixtures(connection, [a, b]);
    assert.equal((await db.query("SELECT id FROM sanayipro.organizations")).rows.length, 2);
    assert.equal((await db.query("SELECT id FROM sanayipro.branches")).rows.length, 4);
    assert.equal((await db.query("SELECT branch_id FROM sanayipro.branch_memberships")).rows.length, 2);
    const c = liveFixture(ids[2], "A");
    await db.query("INSERT INTO sanayipro.user_profiles(id,display_name,active) VALUES ($1,'Inactive',false)", [c.userId]);
    await assert.rejects(provisionLiveFixtures(connection, [c]));
    assert.equal((await db.query("SELECT id FROM sanayipro.organizations WHERE id=$1", [c.organizationId])).rows.length, 0);
    assert.equal((await db.query<{active: boolean}>("SELECT active FROM sanayipro.user_profiles WHERE id=$1", [c.userId])).rows[0].active, false);
  } finally { await db.close(); }
});
