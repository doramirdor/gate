import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Accept only same-origin relative paths. Resolves the candidate against the
 * origin and re-validates the resulting origin, which also defeats
 * backslash-normalization tricks like "/\evil.com".
 */
function resolveNext(next: string | null, origin: string): URL {
  const fallback = new URL("/editor", origin);
  if (!next || !next.startsWith("/") || next.includes("\\")) return fallback;
  try {
    const dest = new URL(next, origin);
    return dest.origin === origin ? dest : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  try {
    if (!code) throw new Error("Missing code");

    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw error ?? new Error("No user");

    const { data: account, error: accountError } = await supabase
      .from("users")
      .select("handle")
      .eq("id", data.user.id)
      .maybeSingle();
    if (accountError) throw accountError;

    if (!account) {
      return NextResponse.redirect(new URL("/onboarding", url.origin));
    }
    return NextResponse.redirect(resolveNext(next, url.origin));
  } catch {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
}
