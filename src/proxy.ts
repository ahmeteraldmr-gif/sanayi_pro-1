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

  const redirectTarget = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return url;
  };

  if (!backendConfigured()) {
    if (isApi)
      return finish(
        NextResponse.json({ error: "CONFIGURATION" }, { status: 503 }),
      );

    // Cookie fallback is development-only; production never trusts it.
    // Even in local dev, cookies must pass HMAC-SHA256 verification.
    const sessionCookie = request.cookies.get("sanayipro-session")?.value;
    const verifiedSession = verifySignedCookiePayload<Record<string, unknown>>(
      sessionCookie,
    );
    const hasSession = localAuthEnabled() && !!verifiedSession;

    const userRole = String(verifiedSession?.role || "");
    const email = String(verifiedSession?.email || "");
    const isDemoSession = Boolean(
      verifiedSession?.isDemoSession ||
        email.startsWith("demo.") ||
        email === "demo.egitim@sanayipro.com",
    );

    // Server-side route protection: Super Admin panel
    if (isSuperAdmin) {
      if (!hasSession) {
        return finish(
          NextResponse.redirect(redirectTarget("/login")),
        );
      }
      if (userRole !== "Süper Admin" || isDemoSession) {
        return finish(
          NextResponse.redirect(redirectTarget("/app")),
        );
      }
    }

    // Server-side route protection: unauthenticated users cannot open /app
    if (isApp) {
      if (!hasSession) {
        return finish(
          NextResponse.redirect(redirectTarget("/login")),
        );
      }
      if (userRole === "Süper Admin") {
        return finish(
          NextResponse.redirect(redirectTarget("/super-admin")),
        );
      }
    }

    return finish(response);
  }

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
        return finish(NextResponse.redirect(redirectTarget("/login")));
      }
      try {
        await verifyPlatformAdmin(data.user.id);
      } catch {
        return finish(NextResponse.redirect(redirectTarget("/app")));
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
    if (!isApp) return finish(response);
    const target =
      code === "UNAUTHENTICATED"
        ? "/login"
        : code === "FORBIDDEN" || code === "TENANT_REQUIRED"
          ? "/auth/tenant"
          : "/login?setup=required";
    return finish(NextResponse.redirect(redirectTarget(target)));
  }
}

export const config = {
  matcher: [
    "/app/:path*",
    "/super-admin/:path*",
    "/super-admin",
    "/login",
    "/register",
    "/auth/:path*",
    "/api/tenant/:path*",
  ],
};
