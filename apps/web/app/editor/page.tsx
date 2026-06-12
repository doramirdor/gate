import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import type { Sections } from "@shared/profile";
import { EditorClient } from "./EditorClient";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/editor");

  const { data: account } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  if (!account) redirect("/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("sections")
    .eq("user_id", user.id)
    .maybeSingle();
  const sections = (profile?.sections ?? {}) as Sections;

  return (
    <AppShell handle={account.handle}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Editor</h1>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-muted">
          Write the context an agent may read, and set how far each section
          reaches. The transmission on the right is exactly what agents receive.
        </p>
      </div>
      <EditorClient handle={account.handle} initialSections={sections} />
    </AppShell>
  );
}
