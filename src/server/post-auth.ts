import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { tenantChoicesForVerifiedIdentity } from "./authorization";
import { ensureOwnerProvisioned } from "./onboarding";
import { TENANT_COOKIE, onboardingConfigured } from "./security";

// Runs after Supabase has verified the identity (sign-in, sign-up with session or
// e-mail confirmation callback). Completes any interrupted onboarding, then selects the
// tenant on the server from real memberships; the cookie only carries IDs.
export async function completeSignIn(user: User): Promise<string> {
  let choices = await tenantChoicesForVerifiedIdentity(user.id);
  if (!choices.length && onboardingConfigured()) {
    try {
      await ensureOwnerProvisioned(user);
    } catch {
      // Surface as "no workspace" below; the next sign-in retries idempotently.
    }
    choices = await tenantChoicesForVerifiedIdentity(user.id);
  }
  const store = await cookies();
  if (choices.length === 1) {
    store.set(
      TENANT_COOKIE,
      JSON.stringify({
        organizationId: choices[0].organizationId,
        branchId: choices[0].branchId,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      },
    );
    return "/app";
  }
  store.delete(TENANT_COOKIE);
  return "/auth/tenant";
}
