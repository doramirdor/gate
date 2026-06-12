import Link from "next/link";
import { BRAND_NAME, DOMAIN, SITE_URL } from "@shared/brand";
import { SECTION_HINTS, SECTION_KEYS, SECTION_LABELS } from "@shared/profile";
import { Logo } from "@/components/Logo";
import { WaitlistForm } from "./WaitlistForm";
import { HeroHandleInput } from "./HeroHandleInput";
import { HeroDemo } from "./HeroDemo";
import { Reveal } from "./Reveal";

/* Landing palette: light and editorial, scoped to this page via inline styles
   so the dark app chrome stays as-is. Renders SF Pro on Apple devices. */
const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", system-ui, sans-serif';
const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const PANEL = "#f5f5f7";
const WHITE = "#ffffff";
const AMBER = "#f5a623";
const AMBER_BG = "#fff4e0";
const AMBER_TX = "#8a5300";
const GREEN_TX = "#1a7f55";
const GREEN_BG = "#e8f6ef";
const RED_TX = "#c0362c";
const MONO = "var(--font-jetbrains)";

/* ------------------------------------------------------------------ icons */

function Glyph({
  children,
  size = 18,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconCart = (
  <Glyph>
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M3 4h2l2.4 11.4a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.78L20 8H6" />
  </Glyph>
);
const IconPlane = (
  <Glyph>
    <path d="M10.5 13.5 4 15l-1.5-2 5-3-1-5L8 4l3 6 5-3 2 1-5 4 2 7-1.5 1z" />
  </Glyph>
);
const IconMail = (
  <Glyph>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Glyph>
);
const IconCalendar = (
  <Glyph>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v3M16 3v3" />
  </Glyph>
);
const IconSpark = (
  <Glyph size={20}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Glyph>
);
/* Official brand marks (Simple Icons) for the first-wave connectors, each
   shown on a white tile in its brand color. */
const LOGO_GMAIL =
  "M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z";
const LOGO_GCAL =
  "M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z";
const LOGO_OPENAI =
  "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";
const LOGO_NOTION =
  "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z";

function LogoTile({ path, color }: { path: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[7px]"
      style={{ width: 28, height: 28, background: WHITE, border: `1px solid ${LINE}` }}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill={color} aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}

/* --------------------------------------------------------------- elements */

function PrimaryLink({
  href,
  children,
  light,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className="lp-press inline-flex h-12 items-center justify-center rounded-full px-7 text-[15px] font-medium"
      style={light ? { background: WHITE, color: INK } : { background: INK, color: WHITE }}
    >
      {children}
    </Link>
  );
}

function GhostLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="lp-press inline-flex h-12 items-center justify-center rounded-full px-7 text-[15px] font-medium"
      style={{ background: WHITE, color: INK, border: `1px solid ${LINE}` }}
    >
      {children}
    </Link>
  );
}

function Chip({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h2
        className="font-semibold"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
      >
        {children}
      </h2>
      {sub ? (
        <p className="mt-3 text-[15px]" style={{ color: MUTE, lineHeight: 1.6 }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/* A line inside a vignette: label left, value right. */
function VRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span style={{ color: strong ? INK : MUTE, fontWeight: strong ? 600 : 400 }}>
        {label}
      </span>
      <span
        style={{
          color: INK,
          fontWeight: strong ? 600 : 400,
          fontFamily: mono ? MONO : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* On-brand mini-UI standing in for a product screenshot, one per use case. */
function UseCaseVisual({ id }: { id: string }) {
  let inner: React.ReactNode = null;

  if (id === "shopping") {
    inner = (
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
            <span style={{ color: MUTE }}>{IconCart}</span> Grocery order
          </span>
          <Chip bg={GREEN_BG} color={GREEN_TX}>within budget</Chip>
        </div>
        <div className="mt-3 space-y-2">
          <VRow label="Oat milk ×2" value="$7.80" mono />
          <VRow label="Bananas" value="$3.20" mono />
          <VRow label="Olive oil" value="$12.00" mono />
        </div>
        <div className="mt-3 border-t pt-2" style={{ borderColor: LINE }}>
          <VRow label="Total" value="$23.00" mono strong />
        </div>
      </div>
    );
  } else if (id === "travel") {
    inner = (
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
            <span style={{ color: MUTE }}>{IconPlane}</span> Flight hold
          </span>
          <Chip bg={AMBER_BG} color={AMBER_TX}>awaiting payment</Chip>
        </div>
        <div className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: INK }}>
          TLV <span style={{ color: MUTE }}>to</span> JFK
        </div>
        <div className="mt-2 text-[13px]" style={{ color: MUTE, fontFamily: MONO }}>
          Departs 11:40 · Seat 14C · 1 carry-on
        </div>
      </div>
    );
  } else if (id === "inbox") {
    inner = (
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
            <span style={{ color: MUTE }}>{IconMail}</span> Draft reply
          </span>
          <Chip bg={AMBER_BG} color={AMBER_TX}>needs approval</Chip>
        </div>
        <div className="mt-3 text-sm font-medium" style={{ color: INK }}>
          Re: Q3 proposal
        </div>
        <p className="mt-1 text-[13px]" style={{ color: MUTE, lineHeight: 1.5 }}>
          Thanks for sending this over. A couple of thoughts before we lock the
          scope and timeline.
        </p>
      </div>
    );
  } else {
    inner = (
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
            <span style={{ color: MUTE }}>{IconCalendar}</span> This week
          </span>
          <span className="text-[11px]" style={{ color: MUTE, fontFamily: MONO }}>
            Asia/Jerusalem
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: MUTE }}>
            <span style={{ fontFamily: MONO }}>09:00</span> Open
          </div>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
            style={{ background: GREEN_BG, color: GREEN_TX, fontWeight: 600 }}
          >
            <span style={{ fontFamily: MONO }}>10:30</span> Design review · booked
          </div>
          <div className="flex items-center gap-2 text-[13px]" style={{ color: MUTE }}>
            <span style={{ fontFamily: MONO }}>14:00</span> Open
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-xl p-4"
      style={{ background: PANEL, height: 184 }}
    >
      <div
        className="flex h-full w-full items-center rounded-lg p-4"
        style={{ background: WHITE, border: `1px solid ${LINE}` }}
      >
        {inner}
      </div>
    </div>
  );
}

/* The approval inbox, mocked for the demo frame. */
function InboxMock() {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-xl p-4"
        style={{ background: WHITE, border: `1px solid ${LINE}`, borderTop: `3px solid ${AMBER}` }}
      >
        <div className="flex items-center gap-2">
          <Chip bg={AMBER_BG} color={AMBER_TX}>Approval needed</Chip>
          <span className="text-xs" style={{ color: MUTE }}>from outreach-bot</span>
        </div>
        <p className="mt-3 text-sm font-medium" style={{ color: INK }}>
          Email a proposal to 3 new leads
        </p>
        <p className="mt-1 text-xs" style={{ color: MUTE, fontFamily: MONO }}>
          email · 3 recipients
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex h-8 items-center rounded-full px-4 text-xs font-medium" style={{ background: INK, color: WHITE }}>
            Approve
          </span>
          <span className="inline-flex h-8 items-center rounded-full px-4 text-xs font-medium" style={{ color: RED_TX, border: `1px solid ${LINE}` }}>
            Deny
          </span>
          <span className="inline-flex h-8 items-center rounded-full px-4 text-xs font-medium" style={{ color: MUTE, border: `1px solid ${LINE}` }}>
            Always allow email
          </span>
        </div>
      </div>

      <div
        className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{ background: WHITE, border: `1px solid ${LINE}` }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: INK }}>
            Booked dinner at Giraffe
          </p>
          <p className="text-xs" style={{ color: MUTE, fontFamily: MONO }}>
            $58 · dining · auto-approved under your $100 limit
          </p>
        </div>
        <Chip bg={GREEN_BG} color={GREEN_TX}>Approved</Chip>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- content */

const USE_CASES = [
  {
    id: "shopping",
    title: "Shopping and errands",
    body: "Your assistant orders groceries and household goods within your budget, and checks with you before anything over your limit.",
  },
  {
    id: "travel",
    title: "Travel",
    body: "It finds flights and hotels in your style, then waits for your yes before it pays for anything.",
  },
  {
    id: "inbox",
    title: "Inbox and messages",
    body: "It drafts replies in your voice and sends only the ones you approve. Nothing goes out on its own.",
  },
  {
    id: "scheduling",
    title: "Scheduling",
    body: "It books meetings inside your working hours and timezone, with no back and forth.",
  },
] as const;

const FAQS = [
  {
    q: `What is ${BRAND_NAME}?`,
    a: `${BRAND_NAME} is one link that holds your preferences and approvals for AI assistants. Agents read the context you allow, and must get your approval before they spend money, send messages, or take any action you cannot undo.`,
  },
  {
    q: "Which AI assistants does it work with?",
    a: "Any assistant that speaks the Model Context Protocol (MCP), including Claude and ChatGPT based agents. Developers can also drop in the Claude Code hook to gate sensitive commands.",
  },
  {
    q: "How do approvals work?",
    a: "When an agent wants to act, you get a request in the web inbox or on Telegram and approve or deny it in one tap. Set a budget or trusted categories to auto clear small, routine actions, so you are only asked about what matters.",
  },
  {
    q: "Is my information private?",
    a: "You choose each section's reach: public, link only, or private. Agents receive only what your link allows, and every read is recorded in your log.",
  },
  {
    q: "Do I need to write code?",
    a: "No. You claim a handle, fill a short profile, and paste your link into your assistant. Developers can also use the Claude Code hook and self host the whole thing.",
  },
  {
    q: `How much does ${BRAND_NAME} cost?`,
    a: "You can start for free.",
  },
] as const;

const INTEGRATIONS = ["Claude", "ChatGPT", "Claude Code", "Any MCP agent"];

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: BRAND_NAME,
        url: SITE_URL,
        description: `${BRAND_NAME} is one link that holds your preferences and approvals for AI assistants.`,
      },
      {
        "@type": "SoftwareApplication",
        name: BRAND_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "Give AI assistants the preferences they need to act for you, and approve anything that spends money, sends a message, or cannot be undone.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default function LandingPage() {
  return (
    <div style={{ background: WHITE, color: INK, fontFamily: FONT }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />

      <div className="mx-auto w-full max-w-6xl px-6">
        {/* Nav */}
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2" style={{ color: INK }}>
            <Logo className="h-5 w-5" />
            <span className="text-[15px] font-semibold tracking-tight">
              {BRAND_NAME.toLowerCase()}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="#how" className="lp-nav hidden h-9 items-center px-1 text-sm font-medium sm:inline-flex" style={{ color: INK }}>
              How it works
            </Link>
            <Link href="/blog" className="lp-nav hidden h-9 items-center px-1 text-sm font-medium sm:inline-flex" style={{ color: INK }}>
              Blog
            </Link>
            <Link href="/login" className="hidden h-9 items-center rounded-full px-4 text-sm font-medium sm:inline-flex" style={{ color: INK }}>
              Sign in
            </Link>
            <Link href="/login" className="lp-press inline-flex h-9 items-center rounded-full px-4 text-sm font-medium" style={{ background: INK, color: WHITE }}>
              Create your link
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="pb-10 pt-16 text-center sm:pt-24">
          <h1
            className="lp-rise mx-auto max-w-4xl font-semibold"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)", lineHeight: 1.04, letterSpacing: "-0.03em", animationDelay: "0ms" }}
          >
            One link for every AI
            <br />
            that acts for you.
          </h1>

          <p
            className="lp-rise mx-auto mt-6 max-w-2xl"
            style={{ color: MUTE, fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)", lineHeight: 1.55, animationDelay: "120ms" }}
          >
            Your preferences, your budget, your rules - saved once,
            read by every assistant you use. It handles the small stuff
            and asks before anything it can't undo.
          </p>

          <div className="lp-rise mt-9" style={{ animationDelay: "180ms" }}>
            <HeroHandleInput />
          </div>
          <p className="lp-rise mt-3 text-sm" style={{ color: MUTE, animationDelay: "220ms" }}>
            Free forever · 2-minute setup · Works with Claude, ChatGPT, and any MCP agent
          </p>

          {/* Product visual — animated walkthrough (see HeroDemo) */}
          <div className="lp-rise mx-auto mt-16 max-w-4xl rounded-3xl p-3 sm:p-4" style={{ background: PANEL, animationDelay: "300ms" }}>
            <HeroDemo />
          </div>

          {/* Integrations strip */}
          <div className="mt-14">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: MUTE }}>
              Works with the assistants you already use
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {INTEGRATIONS.map((name) => (
                <span key={name} className="text-base font-semibold" style={{ color: INK, opacity: 0.55 }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <Reveal>
        <section id="how" className="scroll-mt-8 py-24 sm:py-28">
          <SectionHeading>Set it up once. It works everywhere.</SectionHeading>
          <div className="lp-stagger mt-12 grid gap-10 sm:grid-cols-3">
            {[
              { n: "1", title: "Save your preferences", body: "Paste an old bio or fill a few fields. It organizes into clean sections in under two minutes." },
              { n: "2", title: "Connect your AI", body: "Add one link to Claude, ChatGPT, or any agent you use. It reads only the parts you allow." },
              { n: "3", title: "Approve only what matters", body: "Anything inside your limits just happens. When something goes over, you get a request, and nothing moves until you approve." },
            ].map((step) => (
              <div key={step.n}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" style={{ background: PANEL, color: INK }}>
                  {step.n}
                </div>
                <h3 className="mt-5 text-lg font-semibold" style={{ color: INK }}>{step.title}</h3>
                <p className="mt-2 text-[15px]" style={{ color: MUTE, lineHeight: 1.6 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Use cases */}
        <Reveal>
        <section className="py-12">
          <SectionHeading sub="A few of the things people hand off, once their assistant knows them and asks before acting.">
            What people use it for
          </SectionHeading>
          <div className="lp-stagger mt-10 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div key={u.id} className="lp-card rounded-2xl p-5" style={{ background: WHITE, border: `1px solid ${LINE}` }}>
                <UseCaseVisual id={u.id} />
                <h3 className="mt-5 text-lg font-semibold" style={{ color: INK }}>{u.title}</h3>
                <p className="mt-2 text-[15px]" style={{ color: MUTE, lineHeight: 1.6 }}>{u.body}</p>
              </div>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Mid-page CTA */}
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-[15px] font-medium" style={{ color: MUTE }}>
            Ready to try it?
          </p>
          <PrimaryLink href="/login">Create your free link</PrimaryLink>
        </div>

        {/* Demo / product preview */}
        <Reveal>
        <section className="py-24 sm:py-28">
          <div className="text-center">
            <SectionHeading>
              <span className="mx-auto block">See an approval, start to finish</span>
            </SectionHeading>
            <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: MUTE, lineHeight: 1.6 }}>
              A request arrives, you tap once, and your assistant continues. The
              whole thing takes seconds.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl" style={{ background: WHITE, border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
              <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
              <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-3 rounded-md px-3 py-1 text-xs" style={{ background: PANEL, color: MUTE, fontFamily: MONO }}>
                {DOMAIN}/inbox
              </span>
            </div>
            <div className="p-4 sm:p-6" style={{ background: PANEL }}>
              <InboxMock />
            </div>
          </div>
        </section>
        </Reveal>

        {/* What's on your card */}
        <Reveal>
        <section className="py-12">
          <div className="rounded-3xl px-6 py-16 sm:px-12" style={{ background: PANEL }}>
            <SectionHeading sub="Seven sections, each visible only to who you choose.">
              One place for everything an AI should know about you.
            </SectionHeading>
            <div className="lp-stagger mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_KEYS.map((key) => (
                <div key={key} className="lp-card rounded-2xl p-5" style={{ background: WHITE, border: `1px solid ${LINE}` }}>
                  <div className="text-[15px] font-semibold" style={{ color: INK }}>{SECTION_LABELS[key]}</div>
                  <p className="mt-1 text-sm" style={{ color: MUTE, lineHeight: 1.55 }}>{SECTION_HINTS[key]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </Reveal>

        {/* For developers */}
        <Reveal>
        <section className="py-24 sm:py-28">
          <SectionHeading sub="One endpoint, three tools. Add Gate to any agent in minutes.">
            Built for developers
          </SectionHeading>

          <div
            className="mt-12 grid gap-px overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ background: LINE, border: `1px solid ${LINE}` }}
          >
            <div className="p-6" style={{ background: WHITE }}>
              <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Claude Desktop</h3>
              <p className="mt-2 text-[13px]" style={{ color: MUTE, lineHeight: 1.55 }}>
                Add to your config and Claude reads your context automatically.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: PANEL, color: INK, fontFamily: MONO }}>
{`"gate": {
  "command": "npx",
  "args": ["-y","mcp-remote",
    "<your-endpoint>"]
}`}
              </pre>
            </div>
            <div className="p-6" style={{ background: WHITE }}>
              <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Claude Code hook</h3>
              <p className="mt-2 text-[13px]" style={{ color: MUTE, lineHeight: 1.55 }}>
                Blocks dangerous commands until you approve.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: PANEL, color: INK, fontFamily: MONO }}>
{`curl -sO https://${DOMAIN}/hook.mjs
# Add as PreToolUse hook
# in settings.json`}
              </pre>
            </div>
            <div className="p-6" style={{ background: WHITE }}>
              <h3 className="text-[15px] font-semibold" style={{ color: INK }}>Any MCP agent</h3>
              <p className="mt-2 text-[13px]" style={{ color: MUTE, lineHeight: 1.55 }}>
                Three tools: get_context, request_approval, check_approval.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: PANEL, color: INK, fontFamily: MONO }}>
{`POST /functions/v1/mcp/{handle}
Authorization: Bearer <token>
Content-Type: application/json`}
              </pre>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <GhostLink href="https://github.com/AskGate/gate">View on GitHub</GhostLink>
            <GhostLink href="/blog">Read the docs</GhostLink>
          </div>
        </section>
        </Reveal>

        {/* Reassurance */}
        <Reveal>
        <section className="py-24 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-semibold" style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.08 }}>
              A prompt can be ignored. A permission check cannot.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[17px]" style={{ color: MUTE, lineHeight: 1.6 }}>
              Telling an AI to ask first is only a request it can skip.{" "}
              {BRAND_NAME} sits outside the AI, so spending and sending really do
              stop until you approve. Every read and every request is recorded
              for you to review.
            </p>
          </div>
        </section>
        </Reveal>

        {/* FAQ */}
        <Reveal>
        <section id="faq" className="scroll-mt-8 py-12">
          <SectionHeading>Questions, answered</SectionHeading>
          <div className="mt-8 overflow-hidden rounded-2xl" style={{ border: `1px solid ${LINE}`, background: WHITE }}>
            {FAQS.map((f, i) => (
              <details key={f.q} className="lp-faq" style={i === 0 ? undefined : { borderTop: `1px solid ${LINE}` }}>
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[16px] font-medium" style={{ color: INK }}>
                  {f.q}
                  <span className="lp-faq-icon shrink-0 text-xl leading-none" style={{ color: MUTE }} aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="lp-faq-body">
                  <div className="lp-faq-inner">
                    <p className="px-5 pb-5 text-[15px]" style={{ color: MUTE, lineHeight: 1.6 }}>{f.a}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
        </Reveal>

        {/* Final CTA */}
        <Reveal>
        <section className="pb-28 pt-12">
          <div className="flex flex-col items-center gap-6 rounded-3xl px-6 py-20 text-center" style={{ background: INK, color: WHITE }}>
            <h2 className="max-w-xl font-semibold" style={{ fontSize: "clamp(1.9rem, 4vw, 2.75rem)", letterSpacing: "-0.025em", lineHeight: 1.08 }}>
              Two minutes to set up. Free forever.
            </h2>
            <p className="max-w-md text-[17px]" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
              Give your AI assistants one link, and keep the final say on everything that matters.
            </p>
            <PrimaryLink href="/login" light>Create your free link</PrimaryLink>
          </div>
        </section>
        </Reveal>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-8 text-sm sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2" style={{ color: INK }}>
                <Logo className="h-4 w-4" />
                <span className="font-semibold">{BRAND_NAME.toLowerCase()}</span>
              </div>
              <p className="mt-2" style={{ color: MUTE }}>
                Let AI act for you. Keep the final say.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Product</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="#how" className="hover:underline" style={{ color: INK }}>How it works</Link>
                <Link href="#faq" className="hover:underline" style={{ color: INK }}>FAQ</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Resources</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/blog" className="hover:underline" style={{ color: INK }}>Blog</Link>
                <Link href="/about" className="hover:underline" style={{ color: INK }}>About</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Legal</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/privacy" className="hover:underline" style={{ color: INK }}>Privacy</Link>
                <Link href="/terms" className="hover:underline" style={{ color: INK }}>Terms</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t pt-6" style={{ borderColor: LINE }}>
            <p style={{ color: MUTE }}>&copy; 2025 {BRAND_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
