import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BRAND_NAME, TAGLINE } from "@shared/brand";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/editor");

  return (
    <main className="theme-light flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-ink">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-7 w-7 text-ink" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-ink">
            {BRAND_NAME}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{TAGLINE}</p>
        </div>
        <LoginForm next={searchParams.next} />
      </Card>
    </main>
  );
}
