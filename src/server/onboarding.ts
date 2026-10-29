import "server-only";
import { Client } from "pg";
import type { User } from "@supabase/supabase-js";
import {
  normalizeOnboardingInput,
  provisionOwner,
  type OnboardingResult,
} from "./onboarding-core";
import { AccessError, getOnboardingDatabaseUrl } from "./security";

// Dedicated short-lived connection: sanayipro_onboarding (INSERT-only, RLS-bound).
// This is never the runtime login and never a migration/service-role credential.
export async function provisionOwnerAccount(input: {
  userId: string;
  displayName: string;
  organizationName: string;
  branchName: string;
}): Promise<OnboardingResult> {
  const normalized = normalizeOnboardingInput(input);
  if (!normalized) throw new AccessError("FORBIDDEN", 403);
  const client = new Client({
    connectionString: getOnboardingDatabaseUrl(),
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
  try {
    await client.connect();
    return await provisionOwner(client, normalized);
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError("UNAVAILABLE", 503);
  } finally {
    await client.end().catch(() => {});
  }
}

// Resume path: sign-up stores the business/branch names in Auth user metadata, so a
// failed or interrupted onboarding is completed idempotently on the next verified
// sign-in. `user` MUST be the object returned by supabase.auth.getUser()/sign-in.
export async function ensureOwnerProvisioned(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const input = normalizeOnboardingInput({
    userId: user.id,
    displayName: meta.display_name,
    organizationName: meta.organization_name,
    branchName: meta.branch_name,
  });
  if (!input) return null;
  return provisionOwnerAccount(input);
}
