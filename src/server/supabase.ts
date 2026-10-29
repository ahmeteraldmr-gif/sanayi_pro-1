import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicAuthConfig } from "./security";

export async function createAuthClient(canSetCookies = false) {
  const { url, key } = getPublicAuthConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        // Server Components cannot write cookies. Proxy performs token refresh.
        if (canSetCookies)
          for (const { name, value, options } of values)
            store.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
      },
    },
  });
}
