import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_NAME, TAGLINE } from "@shared/brand";
import {
  SECTION_KEYS,
  SECTION_LABELS,
  type SectionKey,
  type Sections,
} from "@shared/profile";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui";
import { validateHandle } from "@/lib/handles";
import { markdownToHtml } from "@/lib/markdown";
import { createServiceClient } from "@/lib/supabase/service";

export const revalidate = 60;

export function generateMetadata({
  params,
}: {
  params: { handle: string };
}): Metadata {
  const validated = validateHandle(params.handle);
  const handle = validated.ok ? validated.handle : params.handle;
  return {
    title: handle,
    description: `${handle} - gated context for AI agents.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const validated = validateHandle(params.handle);
  if (!validated.ok) notFound();
  const handle = validated.handle;

  // Service client bypasses RLS intentionally; only sections explicitly
  // marked public are rendered below.
  const service = createServiceClient();

  const { data: account } = await service
    .from("users")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (!account) notFound();

  const { data: profile } = await service
    .from("profiles")
    .select("sections")
    .eq("user_id", account.id)
    .maybeSingle();

  const sections = (profile?.sections ?? {}) as Sections;
  const publicSections = SECTION_KEYS.flatMap((key: SectionKey) => {
    const section = sections[key];
    if (!section || section.visibility !== "public" || !section.content.trim()) {
      return [];
    }
    return [{ key, label: SECTION_LABELS[key], html: markdownToHtml(section.content) }];
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-line py-5">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight">
            {BRAND_NAME.toLowerCase()}
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Claim yours
        </Link>
      </header>

      <main className="flex-1 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{handle}</h1>
        <div className="mt-3">
          <Badge tone="green">this human&apos;s agents are gated</Badge>
        </div>

        {publicSections.length === 0 ? (
          <p className="mt-12 text-sm text-ink-muted">
            This human shares context with their agents privately.
          </p>
        ) : (
          <div className="mt-12 space-y-12">
            {publicSections.map(({ key, label, html }) => (
              <section key={key}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ink-muted">
                  {label}
                </h2>
                <div
                  className="prose-profile text-sm"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between gap-4 border-t border-line py-6 text-sm text-ink-muted">
        <div className="flex items-center gap-2">
          <Logo className="h-4 w-4" />
          <span>{TAGLINE}</span>
        </div>
        <Link href="/" className="shrink-0 transition-colors hover:text-ink">
          Claim your link
        </Link>
      </footer>
    </div>
  );
}
