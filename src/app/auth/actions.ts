"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/server/supabase";
import { getVerifiedUser } from "@/server/auth";
import { authorizeVerifiedIdentity } from "@/server/authorization";
import {
  clearLocalSession,
  localSignIn,
  localSignUp,
  startDemoSession,
  startSuperAdminSession,
  startServiceManagerSession,
  startTechnicianSession,
} from "@/server/local-auth";
import { provisionOwnerAccount } from "@/server/onboarding";
import { completeSignIn } from "@/server/post-auth";
import {
  backendConfigured,
  isUuid,
  onboardingConfigured,
  sanitizeRedirectUrl,
  TENANT_COOKIE,
} from "@/server/security";

export type LoginState = { error?: string } | null;

export type SignUpState = {
  error?: string;
  emailConfirmationRequired?: boolean;
  message?: string;
} | null;

const LOGIN_ERROR = "E-posta veya şifre hatalı.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRedirect(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function signInAction(
  previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  void previous;
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const redirectTo = sanitizeRedirectUrl(String(form.get("redirectTo") ?? ""));

  if (
    email.length > 254 ||
    !emailPattern.test(email) ||
    !password ||
    password.length > 1024
  ) {
    return { error: LOGIN_ERROR };
  }

  const isDemoUser =
    email === "superadmin@sanayipro.com" ||
    email === "admin@sanayipro.com" ||
    email === "mehmet.usta@sanayipro.com" ||
    email === "demo@sanayipro.com" ||
    email.startsWith("demo.");

  // If local auth is used or it's a known demo user, sign in directly via localSignIn
  if (!backendConfigured() || isDemoUser) return localSignIn(email, password, redirectTo);

  let target = "/auth/tenant";
  try {
    const client = await createAuthClient(true);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user || data.user.is_anonymous) {
      return { error: LOGIN_ERROR };
    }
    target = await completeSignIn(data.user);
    if (redirectTo && redirectTo.startsWith("/")) {
      target = redirectTo;
    }
  } catch (err) {
    if (isRedirect(err)) throw err;
    return {
      error: "Giriş şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
  redirect(target);
}

export async function signInFormAction(form: FormData): Promise<void> {
  await signInAction(null, form);
}

export async function startSuperAdminAction(targetOrForm?: string | FormData): Promise<void> {
  const redirectTo = typeof targetOrForm === "string" ? targetOrForm : String(targetOrForm?.get?.("redirectTo") ?? "");
  await startSuperAdminSession();
  const safe = sanitizeRedirectUrl(redirectTo, "/super-admin");
  const target = safe === "/super-admin" || safe.startsWith("/super-admin/") ? safe : "/super-admin";
  redirect(target);
}

export async function startServiceManagerAction(targetOrForm?: string | FormData): Promise<void> {
  const redirectTo = typeof targetOrForm === "string" ? targetOrForm : String(targetOrForm?.get?.("redirectTo") ?? "");
  await startServiceManagerSession();
  const safe = sanitizeRedirectUrl(redirectTo, "/app");
  const target = safe === "/super-admin" || safe.startsWith("/super-admin/") ? "/app" : safe;
  redirect(target);
}

export async function startTechnicianAction(targetOrForm?: string | FormData): Promise<void> {
  const redirectTo = typeof targetOrForm === "string" ? targetOrForm : String(targetOrForm?.get?.("redirectTo") ?? "");
  await startTechnicianSession();
  const safe = sanitizeRedirectUrl(redirectTo, "/app");
  const target = safe === "/super-admin" || safe.startsWith("/super-admin/") ? "/app" : safe;
  redirect(target);
}

export async function startDemoTrialAction(branchOrForm?: string | FormData, redirectTo?: string): Promise<void> {
  let branchId = "motor-mekanik";
  let target = redirectTo;
  if (typeof branchOrForm === "string") {
    branchId = branchOrForm || "motor-mekanik";
  } else if (branchOrForm) {
    branchId = String(branchOrForm.get("branchId") ?? "motor-mekanik");
    target = String(branchOrForm.get("redirectTo") ?? target ?? "");
  }
  await startDemoSession(branchId);
  const safe = sanitizeRedirectUrl(target, "/app");
  const finalTarget = safe === "/super-admin" || safe.startsWith("/super-admin/") ? "/app" : safe;
  redirect(finalTarget);
}

async function requestOrigin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  if (!host) return undefined;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const protocol = local ? "http" : "https";
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return undefined;
  }
}

export async function signUpAction(
  previous: SignUpState,
  form: FormData,
): Promise<SignUpState> {
  void previous;

  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const passwordConfirm = String(form.get("passwordConfirm") ?? "");
  const organizationName = String(form.get("organizationName") ?? "").trim();
  const branchName = String(form.get("branchName") ?? "").trim();

  if (!fullName) {
    return { error: "Lütfen ad ve soyadınızı girin." };
  }
  if (!email || !emailPattern.test(email) || email.length > 254) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }
  if (!password || password.length < 8 || password.length > 1024) {
    return { error: "Şifre en az 8 karakter olmalıdır." };
  }
  if (password !== passwordConfirm) {
    return { error: "Girdiğiniz şifreler eşleşmiyor." };
  }
  if (!organizationName) {
    return { error: "Lütfen işletme adını girin." };
  }
  if (!branchName) {
    return { error: "Lütfen ilk şube adını girin." };
  }
  if (fullName.length > 120 || organizationName.length > 120 || branchName.length > 120) {
    return { error: "Girilen bilgiler çok uzun. Lütfen kısaltın." };
  }

  if (!backendConfigured())
    return localSignUp({ fullName, email, password, organizationName, branchName });

  // Never create an Auth user we are unable to provision a workspace for.
  if (!onboardingConfigured()) {
    return {
      error: "Kayıt şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.",
    };
  }

  let target: string | null = null;
  try {
    const client = await createAuthClient(true);
    const origin = await requestOrigin();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName,
          organization_name: organizationName,
          branch_name: branchName,
        },
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });

    if (error) {
      if (
        error.status === 422 ||
        error.message?.toLowerCase().includes("already registered")
      ) {
        return { error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var." };
      }
      return {
        error:
          "Kayıt işlemi şu anda tamamlanamıyor. Lütfen bilgilerinizi kontrol edin.",
      };
    }
    if (!data.user || data.user.is_anonymous) {
      return { error: "Hesap oluşturulamadı. Lütfen tekrar deneyin." };
    }
    // Supabase hides duplicate e-mails behind an identity-less user object.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var." };
    }

    // One RLS-bound transaction: profile, organization, branch, owner role and both
    // memberships — or nothing. data.user.id comes from the Auth server response.
    try {
      await provisionOwnerAccount({
        userId: data.user.id,
        displayName: fullName,
        organizationName,
        branchName,
      });
    } catch {
      return {
        error:
          "Hesabınız oluşturuldu ancak işletme kurulumu tamamlanamadı. Lütfen giriş yaparak devam edin.",
      };
    }

    if (!data.session) {
      return {
        emailConfirmationRequired: true,
        message:
          "E-posta adresinize doğrulama bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol edin.",
      };
    }
    target = await completeSignIn(data.user);
  } catch (err) {
    if (isRedirect(err)) throw err;
    return { error: "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin." };
  }
  redirect(target);
}

export async function selectTenantAction(form: FormData) {
  const organizationId = form.get("organizationId");
  const branchId = form.get("branchId");
  if (!isUuid(organizationId) || !isUuid(branchId))
    redirect("/auth/tenant?denied=1");
  try {
    const user = await getVerifiedUser();
    await authorizeVerifiedIdentity(
      user.id,
      { organizationId, branchId },
      "app.access",
      async (tx) => {
        void tx;
      },
    );
    (await cookies()).set(
      TENANT_COOKIE,
      JSON.stringify({ organizationId, branchId }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      },
    );
  } catch {
    redirect("/auth/tenant?denied=1");
  }
  redirect("/app");
}

export async function signOutAction() {
  try {
    if (backendConfigured()) {
      await (await createAuthClient(true)).auth.signOut({ scope: "local" });
    }
  } catch {
    /* Local cookies are cleared even if the provider is unavailable. */
  }
  const store = await cookies();
  store.delete(TENANT_COOKIE);
  await clearLocalSession();
  for (const cookie of store.getAll()) {
    if (/^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name)) {
      store.delete(cookie.name);
    }
  }
  redirect("/login");
}
