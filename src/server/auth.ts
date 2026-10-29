import "server-only";
import { cache } from "react";
import { createAuthClient } from "./supabase";
import { AccessError } from "./security";

// React cache is request-scoped. No cross-request session/tenant cache.
export const getVerifiedUser = cache(async () => {
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous)
    throw new AccessError("UNAUTHENTICATED", 401);
  return data.user;
});
