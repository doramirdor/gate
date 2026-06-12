import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND_NAME, SITE_URL } from "@shared/brand";
import { MarketingShell } from "@/components/MarketingShell";
import { POSTS, getPost, formatDate } from "../posts";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const PANEL = "#f5f5f7";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} - ${BRAND_NAME}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

function renderMarkdown(content: string) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mb-4 mt-10 text-xl font-semibold"
          style={{ color: INK, letterSpacing: "-0.01em" }}
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="mb-3 mt-8 text-lg font-semibold"
          style={{ color: INK }}
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("- [ ] ") || line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- [ ] ") || lines[i].startsWith("- "))) {
        items.push(lines[i].replace(/^- \[[ x]\] /, "").replace(/^- /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-4 space-y-2 pl-5" style={{ listStyleType: "disc" }}>
          {items.map((item, j) => (
            <li key={j} className="text-[16px]" style={{ color: INK, lineHeight: 1.7 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.startsWith("1. ")) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-4 space-y-2 pl-5" style={{ listStyleType: "decimal" }}>
          {items.map((item, j) => (
            <li key={j} className="text-[16px]" style={{ color: INK, lineHeight: 1.7 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-6 overflow-x-auto rounded-xl p-5 text-sm"
          style={{ background: PANEL, color: INK, fontFamily: "var(--font-jetbrains)" }}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="my-4 text-[16px]" style={{ color: INK, lineHeight: 1.75 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: INK }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded px-1.5 py-0.5 text-[14px]"
          style={{ background: PANEL, fontFamily: "var(--font-jetbrains)" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <MarketingShell>
      <article className="mx-auto w-full max-w-3xl px-6">
        <header className="pb-8 pt-16 sm:pt-24">
          <Link
            href="/blog"
            className="mb-6 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: MUTE }}
          >
            &larr; All posts
          </Link>
          <span
            className="mt-4 inline-block rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: PANEL, color: MUTE }}
          >
            {post.category}
          </span>
          <h1
            className="mt-4 font-semibold"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
            }}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-[17px]" style={{ color: MUTE, lineHeight: 1.6 }}>
            {post.description}
          </p>
          <p className="mt-4 text-sm" style={{ color: MUTE }}>
            {formatDate(post.date)} · {post.readTime}
          </p>
        </header>

        <div
          className="border-t pb-24 pt-8"
          style={{ borderColor: LINE }}
        >
          {renderMarkdown(post.content)}
        </div>

        <div
          className="mb-24 rounded-2xl p-8 text-center"
          style={{ background: PANEL }}
        >
          <h3 className="text-lg font-semibold" style={{ color: INK }}>
            Put yourself back in the loop.
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: MUTE, lineHeight: 1.6 }}>
            Give your AI assistants one link, and yourself the final say.
          </p>
          <Link
            href="/login"
            className="lp-press mt-5 inline-flex h-10 items-center rounded-full px-6 text-sm font-medium"
            style={{ background: INK, color: "#fff" }}
          >
            Get your free link
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
