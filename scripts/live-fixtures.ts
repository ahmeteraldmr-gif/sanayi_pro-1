import assert from "node:assert/strict";
import { createHash } from "node:crypto";

type FixtureConnection = {
  query(sql: string, values?: unknown[]): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
  }>;
};

export function liveFixture(userId: string, label: "A" | "B") {
  const id = (part: string) => {
    const hex = createHash("sha256").update(`sanayipro-live-v1:${userId}:${part}`).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  };
  return {
    userId, label,
    organizationId: id("organization"), branchId: id("branch"),
    unassignedBranchId: id("unassigned"), roleId: id("role"),
    name: `SanayiPro Test İşletme ${label}`,
  };
}
export type LiveFixture = ReturnType<typeof liveFixture>;

// Dedicated persistent demo tenants, not production business data. Never overwrite
// existing profiles, memberships or grants. A mismatch aborts the transaction.
export async function provisionLiveFixtures(client: FixtureConnection, fixtures: LiveFixture[]) {
  await client.query("BEGIN");
  try {
    for (const f of fixtures) {
      const existing = await client.query("SELECT id,name,active FROM sanayipro.organizations WHERE id=$1", [f.organizationId]);
      if (existing.rowCount) {
        assert.equal(existing.rows[0].name, f.name, "Existing fixture identity mismatch");
        assert.equal(existing.rows[0].active, true, "Existing fixture is inactive");
        continue; // Verify below; do not repair or expand existing tenant grants.
      }
      await client.query("INSERT INTO sanayipro.user_profiles(id,display_name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [f.userId, `Test Kullanıcısı ${f.label}`]);
      await client.query("INSERT INTO sanayipro.organizations(id,name) VALUES ($1,$2)", [f.organizationId, f.name]);
      await client.query("INSERT INTO sanayipro.branches(id,organization_id,name) VALUES ($1,$2,'Test Merkez'),($3,$2,'Test Atanmamış Şube')", [f.branchId, f.organizationId, f.unassignedBranchId]);
      await client.query("INSERT INTO sanayipro.roles(id,organization_id,code,name) VALUES ($1,$2,'owner','Test İşletme Sahibi')", [f.roleId, f.organizationId]);
      await client.query("INSERT INTO sanayipro.role_permissions(organization_id,role_id,permission_code) SELECT $1,$2,code FROM sanayipro.permissions WHERE code IN ('app.access','tenant.read')", [f.organizationId, f.roleId]);
      await client.query("INSERT INTO sanayipro.organization_memberships(organization_id,user_id,role_id) VALUES ($1,$2,$3)", [f.organizationId, f.userId, f.roleId]);
      await client.query("INSERT INTO sanayipro.branch_memberships(branch_id,organization_id,user_id,role_id) VALUES ($1,$2,$3,$4)", [f.branchId, f.organizationId, f.userId, f.roleId]);
    }
    for (const f of fixtures) {
      const { rows } = await client.query(`SELECT bm.user_id,bm.branch_id,bm.role_id FROM sanayipro.branch_memberships bm
        JOIN sanayipro.organization_memberships om ON om.organization_id=bm.organization_id AND om.user_id=bm.user_id
        JOIN sanayipro.user_profiles p ON p.id=bm.user_id
        WHERE bm.organization_id=$1 AND bm.active AND om.active AND p.active`, [f.organizationId]);
      assert.deepEqual(rows, [{ user_id: f.userId, branch_id: f.branchId, role_id: f.roleId }], "Dedicated test tenant membership mismatch");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
