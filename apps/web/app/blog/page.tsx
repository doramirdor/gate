import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, SITE_URL } from "@shared/brand";
import { MarketingShell } from "@/components/MarketingShell";
import { POSTS, formatDate } from "./posts";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const WHITE = "#ffffff";
const PANEL = "#f5f5f7";

export const metadata: Metadata = {
  title: `Blog - ${BRAND_NAME}`,
  description: `Thoughts on AI agent permissions, trust, and the tools that keep humans in the loop.`,
  openGraph: {
    title: `Blog - ${BRAND_NAME}`,
    description: `Thoughts on AI agent permissions, trust, and the tools that keep humans in the loop.`,
    url: `${SITE_URL}/blog`,
  },
};

export default function BlogIndex() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-6xl px-6">
        <section className="pb-16 pt-16 sm:pt-24">
          <h1
            className="font-semibold"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Blog
          </h1>
          <p className="mt-4 max-w-xl text-[17px]" style={{ color: MUTE, lineHeight: 1.6 }}>
            Thoughts on AI agent permissions, trust, and the tools that keep
            humans in the loop.
          </p>
        </section>

        <section className="pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl p-6 transition-colors"
                style={{ background: WHITE, border: `1px solid ${LINE}` }}
              >
                <span
                  className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: PANEL, color: MUTE }}
                >
                  {post.category}
                </span>
                <h2
                  className="mt-4 text-lg font-semibold leading-snug group-hover:underline"
                  style={{ color: INK }}
                >
                  {post.title}
                </h2>
                <p className="mt-2 text-sm" style={{ color: MUTE, lineHeight: 1.6 }}>
                  {post.description}
                </p>
                <p className="mt-4 text-xs" style={{ color: MUTE }}>
                  {formatDate(post.date)} · {post.readTime}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
