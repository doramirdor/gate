import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BRAND_NAME } from "@shared/brand";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata: Metadata = { title: "Get set up" };

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) redirect("/editor");

  return (
    <div className="theme-light min-h-screen bg-bg text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
      <header className="flex items-center justify-center py-8">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight">
            {BRAND_NAME.toLowerCase()}
          </span>
        </Link>
      </header>
        <main className="flex-1 pb-16">
          <OnboardingFlow />
        </main>
      </div>
    </div>
  );
}
