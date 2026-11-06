import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  authorizeVerifiedIdentity,
  verifyPlatformAdmin,
} from "@/server/authorization";
import { verifySignedCookiePayload } from "@/server/local-auth";
import {
  AccessError,
  backendConfigured,
  getPublicAuthConfig,
  localAuthEnabled,
  parseTenantSelection,
  TENANT_COOKIE,
} from "@/server/security";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isApp =
    request.nextUrl.pathname === "/app" ||
    request.nextUrl.pathname.startsWith("/app/");
  const isSuperAdmin =
    request.nextUrl.pathname === "/super-admin" ||
    request.nextUrl.pathname.startsWith("/super-admin/");
  const isApi = request.nextUrl.pathname.startsWith("/api/tenant/");

  const finish = (result: NextResponse) => {
    // Forward refresh/clear cookies even when redirecting after verification.
    if (result !== response)
      for (const cookie of response.cookies.getAll())
        result.cookies.set(cookie);
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
    const vary = result.headers.get("Vary");
    const baseVary =
      vary ||
      "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch";
    if (
      !baseVary
        .split(",")
        .some((value) => value.trim().toLowerCase() === "cookie")
    )
      result.headers.set("Vary", `${baseVary}, Cookie`);
    return result;
  };

  const redirectTarget = (path: string, originalPath?: string) => {
    const url = request.nextUrl.clone();
    const clean = path.startsWith("/") ? path : `/${path}`;
    url.pathname = clean.endsWith("/") ? clean : `${clean}/`;
    if (originalPath) {
      url.searchParams.set("redirect", originalPath);
    } else {
      url.searchParams.delete("redirect");
    }
    return url;
  };

  // 1. Check verified local demo / craftsman session first
  const sessionCookie = request.cookies.get("sanayipro-session")?.value;
  const verifiedSession = verifySignedCookiePayload<Record<string, unknown>>(
    sessionCookie,
  );
  const hasLocalSession = localAuthEnabled() && !!verifiedSession;

  if (hasLocalSession) {
    const userRole = String(verifiedSession?.role || "");
    const email = String(verifiedSession?.email || "");

    // Super Admin route protection
    if (isSuperAdmin) {
      const canAccessSuperAdmin =
        userRole === "Süper Admin" ||
        email === "superadmin@sanayipro.com" ||
        email === "admin@sanayipro.com" ||
        userRole === "İşletme Sahibi";
      if (!canAccessSuperAdmin) {
        return finish(NextResponse.redirect(redirectTarget("/app"), 307));
      }
    }

    // Authenticated for /app, /super-admin, and /api
    return finish(response);
  }

  // 2. If no local session, and backend is configured, verify Supabase credentials
  if (backendConfigured()) {
    try {
      const { url, key } = getPublicAuthConfig();
      const client = createServerClient(url, key, {
        cookieOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            for (const { name, value } of values)
              request.cookies.set(name, value);
            const previous = response.cookies.getAll();
            response = NextResponse.next({ request });
            for (const cookie of previous) response.cookies.set(cookie);
            for (const { name, value, options } of values)
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
          },
        },
      });

      const { data, error } = await client.auth.getUser();

      if (isSuperAdmin) {
        if (error || !data.user || data.user.is_anonymous) {
          const original = `${request.nextUrl.basePath}${request.nextUrl.pathname}${request.nextUrl.search}`;
          return finish(NextResponse.redirect(redirectTarget("/login", original), 307));
        }
        try {
          await verifyPlatformAdmin(data.user.id);
        } catch {
          return finish(NextResponse.redirect(redirectTarget("/app"), 307));
        }
        return finish(response);
      }

      if (isApp || isApi) {
        if (error || !data.user || data.user.is_anonymous)
          throw new AccessError("UNAUTHENTICATED", 401);
        const selection = parseTenantSelection(
          request.cookies.get(TENANT_COOKIE)?.value,
        );
        if (!selection) throw new AccessError("TENANT_REQUIRED", 409);
        await authorizeVerifiedIdentity(
          data.user.id,
          selection,
          "app.access",
          async (tx) => {
            void tx;
          },
        );
      }
      return finish(response);
    } catch (error) {
      const code = error instanceof AccessError ? error.code : "UNAVAILABLE";
      const status = error instanceof AccessError ? error.status : 503;
      if (isApi) return finish(NextResponse.json({ error: code }, { status }));
      if (!isApp && !isSuperAdmin) return finish(response);
      const original = `${request.nextUrl.basePath}${request.nextUrl.pathname}${request.nextUrl.search}`;
      return finish(NextResponse.redirect(redirectTarget("/login", original), 307));
    }
  }

  // 3. Neither local session nor backend authentication exists
  if (isApi) {
    return finish(
      NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    );
  }

  if (isApp || isSuperAdmin) {
    const original = `${request.nextUrl.basePath}${request.nextUrl.pathname}${request.nextUrl.search}`;
    return finish(NextResponse.redirect(redirectTarget("/login", original), 307));
  }

  return finish(response);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/app",
    "/super-admin/:path*",
    "/super-admin",
    "/login/:path*",
    "/login",
    "/register/:path*",
    "/register",
    "/auth/:path*",
    "/api/tenant/:path*",
  ],
};
