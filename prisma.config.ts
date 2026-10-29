import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { migrationConnection } from "./scripts/migration-connection";

config({ path: ".env.local", quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: migrationConnection(process.env.MIGRATION_DATABASE_URL, "prisma") },
});
