import "server-only";
// Development-only fallback used when Supabase is not configured. It is isolated in
// this single module (plus the proxy/layout checks guarded by localAuthEnabled()) so it
// can be deleted without touching the real auth flow. It is refused in production.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { localAuthEnabled, TENANT_COOKIE } from "./security";
import { getBranchProfile } from "@/lib/branch-profiles";

export const LOCAL_SESSION_COOKIE = "sanayipro-session";
const USERS_COOKIE = "sanayipro-registered-users";
const FAILURE = { error: "E-posta veya şifre hatalı." };
const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

type Stored = { name: string; hash: string; org: string; branch: string };
const demoAccounts: Record<string, { name: string; role: string }> = {
  "superadmin@sanayipro.com": { name: "Platform Yöneticisi", role: "Süper Admin" },
  "admin@sanayipro.com": { name: "Ahmet Yılmaz", role: "İşletme Sahibi" },
  "mehmet.usta@sanayipro.com": { name: "Mehmet Usta", role: "Atölye Ustası" },
  "demo@sanayipro.com": { name: "Ahmet Yılmaz", role: "İşletme Sahibi" },
};

// Passwords are never stored: only a salted scrypt hash lives in the httpOnly cookie.
function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}
function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, Buffer.from(salt, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
async function readUsers() {
  const raw = (await cookies()).get(USERS_COOKIE)?.value;
  if (!raw) return {} as Record<string, Stored>;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, Stored>)
      : {};
  } catch {
    return {};
  }
}
async function startSession(session: {
  email: string;
  displayName: string;
  organizationName: string;
  branchName: string;
  role: string;
  organizationId: string;
  branchId: string;
  userId: string;
}) {
  const store = await cookies();
  const options = { ...base, maxAge: 60 * 60 * 24 * 7 };
  store.set(
    TENANT_COOKIE,
    JSON.stringify({
      organizationId: session.organizationId,
      branchId: session.branchId,
    }),
    options,
  );
  store.set(
    LOCAL_SESSION_COOKIE,
    JSON.stringify({ ...session, createdAt: new Date().toISOString() }),
    options,
  );
}
const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export async function localSignIn(email: string, password: string) {
  if (!localAuthEnabled()) return FAILURE;
  const users = await readUsers();
  const registered = users[email];
  const demo = demoAccounts[email];
  if (registered) {
    if (!verifyPassword(password, registered.hash)) return FAILURE;
    await startSession({
      email,
      displayName: registered.name,
      organizationName: registered.org,
      branchName: registered.branch,
      role: "İşletme Sahibi",
      organizationId: uuid(1),
      branchId: uuid(11),
      userId: uuid(101),
    });
    redirect("/app");
  }
  if (password.length < 1) return FAILURE;
  const isSuperAdmin = email === "superadmin@sanayipro.com" || demo?.role === "Süper Admin";
  const fallbackName =
    demo?.name ??
    (email.split("@")[0]
      ? email
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : isSuperAdmin ? "Platform Yöneticisi" : "İşletme Yöneticisi");
  await startSession({
    email,
    displayName: fallbackName,
    organizationName: isSuperAdmin ? "SanayiPro Platform" : "Sanayi Oto Servis",
    branchName: isSuperAdmin ? "Platform Merkezi" : "Dörtyol Şubesi",
    role: demo?.role ?? (isSuperAdmin ? "Süper Admin" : "İşletme Sahibi"),
    organizationId: uuid(isSuperAdmin ? 0 : 1),
    branchId: uuid(isSuperAdmin ? 0 : 11),
    userId: uuid(isSuperAdmin ? 0 : 101),
  });
  if (isSuperAdmin) {
    redirect("/super-admin");
  } else {
    redirect("/app");
  }
}

export async function localSignUp(input: {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  branchName: string;
}) {
  if (!localAuthEnabled())
    return { error: "Kayıt şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin." };
  const users = await readUsers();
  if (users[input.email] || demoAccounts[input.email])
    return { error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var." };
  users[input.email] = {
    name: input.fullName,
    hash: hashPassword(input.password),
    org: input.organizationName,
    branch: input.branchName,
  };
  (await cookies()).set(USERS_COOKIE, JSON.stringify(users), {
    ...base,
    maxAge: 60 * 60 * 24 * 30,
  });
  const random = () => Math.floor(100000000000 + Math.random() * 900000000000);
  await startSession({
    email: input.email,
    displayName: input.fullName,
    organizationName: input.organizationName,
    branchName: input.branchName,
    role: "İşletme Sahibi",
    organizationId: uuid(random()),
    branchId: uuid(random()),
    userId: uuid(random()),
  });
  redirect("/app");
}

export async function clearLocalSession() {
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
}

export async function startDemoSession(branchId: string = "motor-mekanik") {
  const profile = getBranchProfile(branchId);
  await startSession({
    email: `demo.${profile.id}@sanayipro.com`,
    displayName: profile.craftsmanTitle,
    organizationName: profile.businessName,
    branchName: profile.name,
    role: "İşletme Sahibi",
    organizationId: uuid(999),
    branchId: uuid(9991),
    userId: uuid(99901),
  });
}

export async function readLocalSession() {
  if (!localAuthEnabled()) return null;
  const raw = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const email = parsed.email || "";
    let branchSlug = "motor-mekanik";
    if (email.startsWith("demo.") && email.includes("@")) {
      branchSlug = email.replace("demo.", "").split("@")[0];
    }
    return {
      organizationName: parsed.organizationName,
      branchName: parsed.branchName,
      displayName: parsed.displayName,
      role: parsed.role,
      branchSlug,
    };
  } catch {
    return null;
  }
}
