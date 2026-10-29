// CLI-only configuration. Never import migration credentials into the web runtime.
export function migrationConnection(
  raw: string | undefined,
  driver: "pg" | "prisma",
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (!raw) return ""; // Client generation and offline builds need no database.
  try {
    const url = new URL(raw);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      !/^sanayipro_migrator(?:\.[a-z0-9-]+)?$/.test(decodeURIComponent(url.username)) ||
      !url.password ||
      url.searchParams.get("schema") !== "sanayipro" ||
      (!local && url.searchParams.get("sslmode") !== "verify-full") ||
      ["ssl", "sslaccept", "uselibpqcompat", "options"].some((key) => url.searchParams.has(key)) ||
      env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
    ) throw new Error();
    if (driver === "prisma" && url.searchParams.get("sslmode") === "verify-full") {
      // Prisma's native migration engine uses a different TLS option vocabulary.
      // Both encryption and certificate/hostname verification must remain enabled.
      url.searchParams.set("sslmode", "require");
      url.searchParams.set("sslaccept", "strict");
    }
    return url.toString();
  } catch {
    throw new Error("A separate verified-TLS migration connection is required");
  }
}
