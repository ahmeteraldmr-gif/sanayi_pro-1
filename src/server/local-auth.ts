import "server-only";
// Development-only fallback used when Supabase is not configured. It is isolated in
// this single module (plus the proxy/layout checks guarded by localAuthEnabled()) so it
// can be deleted without touching the real auth flow. It is refused in production.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkRateLimit, localAuthEnabled, TENANT_COOKIE } from "./security";
import { getBranchProfile } from "@/lib/branch-profiles";

export const LOCAL_SESSION_COOKIE = "sanayipro-session";
const USERS_COOKIE = "sanayipro-registered-users";
const FAILURE = { error: "E-posta veya şifre hatalı." };
const LOCAL_HMAC_SECRET =
  process.env.SANAYIPRO_LOCAL_HMAC_SECRET ||
  "sanayipro-dev-hmac-secret-do-not-use-in-prod-v2";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

type Stored = {
  name: string;
  hash: string;
  org: string;
  branch: string;
  orgId?: string;
  branchId?: string;
  userId?: string;
  role?: string;
};

const demoAccounts: Record<string, { name: string; role: string }> = {
  "superadmin@sanayipro.com": { name: "Platform Yöneticisi", role: "Süper Admin" },
  "admin@sanayipro.com": { name: "Ahmet Yılmaz", role: "İşletme Sahibi" },
  "mehmet.usta@sanayipro.com": { name: "Mehmet Usta", role: "Atölye Ustası" },
  "demo@sanayipro.com": { name: "Ahmet Yılmaz", role: "İşletme Sahibi" },
};

function signPayload(jsonPayload: string): string {
  const encoded = Buffer.from(jsonPayload, "utf8").toString("base64url");
  const sig = createHmac("sha256", LOCAL_HMAC_SECRET)
    .update(encoded)
    .digest("hex");
  return `${encoded}.${sig}`;
}

export function verifySignedCookiePayload<T>(raw: string | undefined): T | null {
  if (!localAuthEnabled()) return null;
  if (!raw) return null;
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const encoded = raw.slice(0, dotIdx);
  const signature = raw.slice(dotIdx + 1);
  if (!encoded || !signature || signature.length !== 64) return null;
  try {
    const expected = Buffer.from(
      createHmac("sha256", LOCAL_HMAC_SECRET).update(encoded).digest("hex"),
      "hex",
    );
    const actual = Buffer.from(signature, "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

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
  const parsed = verifySignedCookiePayload<Record<string, Stored>>(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
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
  isDemoSession?: boolean;
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
    signPayload(JSON.stringify({ ...session, createdAt: new Date().toISOString() })),
    options,
  );
}
const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export async function localSignIn(email: string, password: string) {
  if (!localAuthEnabled()) return FAILURE;
  try {
    checkRateLimit(`local-signin:${email}`, 12, 60_000);
  } catch {
    return { error: "Çok fazla hatalı giriş denemesi yapıldı. Lütfen 1 dakika bekleyin." };
  }
  const users = await readUsers();
  const registered = users[email];
  if (registered) {
    if (!verifyPassword(password, registered.hash)) return FAILURE;
    await startSession({
      email,
      displayName: registered.name,
      organizationName: registered.org,
      branchName: registered.branch,
      role: registered.role ?? "İşletme Sahibi",
      organizationId: registered.orgId ?? uuid(1),
      branchId: registered.branchId ?? uuid(11),
      userId: registered.userId ?? uuid(101),
      isDemoSession: false,
    });
    redirect("/app");
  }

  // Only explicit demo accounts or demo.<slug>@sanayipro.com are permitted without registration
  const demo = demoAccounts[email];
  const isBranchDemoEmail = email.startsWith("demo.") && email.endsWith("@sanayipro.com");
  if (!demo && !isBranchDemoEmail) {
    return FAILURE;
  }
  if (password.length < 4) return FAILURE;

  const isSuperAdmin = email === "superadmin@sanayipro.com" || demo?.role === "Süper Admin";
  await startSession({
    email,
    displayName: demo?.name ?? "Demo Ustası",
    organizationName: isSuperAdmin ? "SanayiPro Platform" : "Sanayi Oto Servis",
    branchName: isSuperAdmin ? "Platform Merkezi" : "Dörtyol Şubesi",
    role: isSuperAdmin ? "Süper Admin" : (demo?.role ?? "İşletme Sahibi"),
    organizationId: uuid(isSuperAdmin ? 0 : 1),
    branchId: uuid(isSuperAdmin ? 0 : 11),
    userId: uuid(isSuperAdmin ? 0 : 101),
    isDemoSession: isBranchDemoEmail || email === "demo@sanayipro.com",
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
  try {
    checkRateLimit(`local-signup:${input.email}`, 8, 60_000);
  } catch {
    return { error: "Çok fazla kayıt denemesi yapıldı. Lütfen kısa süre sonra tekrar deneyin." };
  }
  const users = await readUsers();
  if (users[input.email] || demoAccounts[input.email])
    return { error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var." };
  const random = () => Math.floor(100000000000 + Math.random() * 900000000000);
  const orgId = uuid(random());
  const branchId = uuid(random());
  const userId = uuid(random());
  users[input.email] = {
    name: input.fullName,
    hash: hashPassword(input.password),
    org: input.organizationName,
    branch: input.branchName,
    orgId,
    branchId,
    userId,
    role: "İşletme Sahibi",
  };
  (await cookies()).set(USERS_COOKIE, signPayload(JSON.stringify(users)), {
    ...base,
    maxAge: 60 * 60 * 24 * 30,
  });
  await startSession({
    email: input.email,
    displayName: input.fullName,
    organizationName: input.organizationName,
    branchName: input.branchName,
    role: "İşletme Sahibi",
    organizationId: orgId,
    branchId,
    userId,
    isDemoSession: false,
  });
  redirect("/app");
}

export async function clearLocalSession() {
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
}

export async function startDemoSession(branchId: string = "motor-mekanik") {
  if (!localAuthEnabled()) return;
  const profile = getBranchProfile(branchId);
  const demoOrgNum = 9000 + profile.order;
  const demoBranchNum = 9100 + profile.order;
  const demoUserNum = 9200 + profile.order;
  await startSession({
    email: `demo.${profile.id}@sanayipro.com`,
    displayName: profile.craftsmanTitle,
    organizationName: profile.businessName,
    branchName: profile.name,
    role: "İşletme Sahibi",
    organizationId: uuid(demoOrgNum),
    branchId: uuid(demoBranchNum),
    userId: uuid(demoUserNum),
    isDemoSession: true,
  });
}

export async function startSuperAdminSession() {
  if (!localAuthEnabled()) return;
  await startSession({
    email: "superadmin@sanayipro.com",
    displayName: "Platform Yöneticisi",
    organizationName: "SanayiPro Platform",
    branchName: "Platform Merkezi",
    role: "Süper Admin",
    organizationId: uuid(0),
    branchId: uuid(0),
    userId: uuid(0),
    isDemoSession: false,
  });
}

export async function startServiceManagerSession() {
  if (!localAuthEnabled()) return;
  await startSession({
    email: "admin@sanayipro.com",
    displayName: "Ahmet Yılmaz",
    organizationName: "Sanayi Oto Servis",
    branchName: "Dörtyol Şubesi",
    role: "İşletme Sahibi",
    organizationId: uuid(1),
    branchId: uuid(11),
    userId: uuid(101),
    isDemoSession: false,
  });
}

export async function readLocalSession() {
  if (!localAuthEnabled()) return null;
  const raw = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
  const parsed = verifySignedCookiePayload<Record<string, unknown>>(raw);
  if (!parsed) return null;
  try {
    const email = String(parsed.email || "");
    let branchSlug = "motor-mekanik";
    let isDemo = Boolean(parsed.isDemoSession);
    if (email.startsWith("demo.") && email.includes("@")) {
      branchSlug = email.replace("demo.", "").split("@")[0];
      isDemo = true;
    }
    const profile = isDemo ? getBranchProfile(branchSlug) : null;
    const defaultOrgId = profile ? uuid(9000 + profile.order) : uuid(1);
    const defaultBranchId = profile ? uuid(9100 + profile.order) : uuid(11);
    return {
      organizationId: String(parsed.organizationId || defaultOrgId),
      branchId: String(parsed.branchId || defaultBranchId),
      organizationName: String(parsed.organizationName || ""),
      branchName: String(parsed.branchName || ""),
      displayName: String(parsed.displayName || ""),
      role: String(parsed.role || "İşletme Sahibi"),
      branchSlug,
      isDemo,
    };
  } catch {
    return null;
  }
}
