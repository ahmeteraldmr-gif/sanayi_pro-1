import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/server/supabase";
import { completeSignIn } from "@/server/post-auth";
import { backendConfigured } from "@/server/security";

export const dynamic = "force-dynamic";

// E-mail confirmation link target (PKCE). Exchanges the one-time code for a session
// stored in httpOnly cookies, completes onboarding if needed and enters the app.
export async function GET(request: NextRequest) {
  const login = (suffix = "") => new URL(`/login${suffix}`, request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (!backendConfigured() || !code || code.length > 2048)
    return NextResponse.redirect(login());
  try {
    const client = await createAuthClient(true);
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.user || data.user.is_anonymous)
      return NextResponse.redirect(login());
    const target = await completeSignIn(data.user);
    return NextResponse.redirect(new URL(target, request.url));
  } catch {
    return NextResponse.redirect(login());
  }
}
