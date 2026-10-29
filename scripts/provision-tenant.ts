import { config } from "dotenv";
import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { isUuid } from "../src/server/security";
import { migrationConnection } from "./migration-connection";

async function main() {
  config({ path: ".env.local", quiet: true });
  const { values } = parseArgs({
    options: {
      user: { type: "string" },
      name: { type: "string" },
      organization: { type: "string" },
      branch: { type: "string" },
    },
    strict: true,
  });
  if (
    !isUuid(values.user) ||
    !values.name?.trim() ||
    !values.organization?.trim() ||
    !values.branch?.trim()
  )
    throw new Error(
      "Usage: --user <existing Supabase Auth UUID> --name <name> --organization <name> --branch <name>",
    );
  const raw = migrationConnection(process.env.MIGRATION_DATABASE_URL, "pg");
  if (!raw) throw new Error("MIGRATION_DATABASE_URL is required");
  const client = new Client({
    connectionString: raw,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const identity = await client.query("SELECT current_user::text AS role");
    if (identity.rows[0]?.role !== "sanayipro_migrator")
      throw new Error("Wrong migration identity");
    await client.query("BEGIN");
    const organizationId = randomUUID(),
      branchId = randomUUID(),
      roleId = randomUUID();
    await client.query(
      "INSERT INTO sanayipro.user_profiles(id,display_name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING",
      [values.user, values.name.trim()],
    );
    await client.query(
      "INSERT INTO sanayipro.organizations(id,name) VALUES ($1,$2)",
      [organizationId, values.organization.trim()],
    );
    await client.query(
      "INSERT INTO sanayipro.branches(id,organization_id,name) VALUES ($1,$2,$3)",
      [branchId, organizationId, values.branch.trim()],
    );
    await client.query(
      "INSERT INTO sanayipro.roles(id,organization_id,code,name) VALUES ($1,$2,'owner','İşletme Sahibi')",
      [roleId, organizationId],
    );
    await client.query(
      "INSERT INTO sanayipro.role_permissions(organization_id,role_id,permission_code) SELECT $1,$2,code FROM sanayipro.permissions",
      [organizationId, roleId],
    );
    await client.query(
      "INSERT INTO sanayipro.organization_memberships(organization_id,user_id,role_id) VALUES ($1,$2,$3)",
      [organizationId, values.user, roleId],
    );
    await client.query(
      "INSERT INTO sanayipro.branch_memberships(branch_id,organization_id,user_id,role_id) VALUES ($1,$2,$3,$4)",
      [branchId, organizationId, values.user, roleId],
    );
    await client.query("COMMIT");
    console.log(
      JSON.stringify({ organizationId, branchId, userId: values.user }),
    );
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(
      "Provisioning failed; verify Auth user, migration login and migration status. No connection secrets are logged.",
    );
  } finally {
    await client.end();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Provisioning failed");
  process.exitCode = 1;
});
