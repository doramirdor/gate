import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, SITE_URL } from "@shared/brand";
import { MarketingShell } from "@/components/MarketingShell";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const PANEL = "#f5f5f7";
const WHITE = "#ffffff";

export const metadata: Metadata = {
  title: `About - ${BRAND_NAME}`,
  description: `${BRAND_NAME} is a permission wall between AI agents and the human they act for. Here is why we are building it.`,
  openGraph: {
    title: `About - ${BRAND_NAME}`,
    description: `A permission wall between AI agents and the human they act for.`,
    url: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-3xl px-6">
        <section className="pb-8 pt-16 sm:pt-24">
          <h1
            className="font-semibold"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            About {BRAND_NAME}
          </h1>
        </section>

        <section className="pb-24">
          <div className="space-y-6 text-[16px]" style={{ color: INK, lineHeight: 1.75 }}>
            <p>
              AI assistants are getting good enough to act on your behalf - order
              groceries, book travel, draft emails, manage your calendar. The
              technology is ready. The trust model is not.
            </p>
            <p>
              Today, the only thing between an AI agent and your credit card is a
              line in the system prompt that says "ask before spending." That is a
              suggestion, not a safeguard. Models can misinterpret it, skip it, or
              hallucinate past it. When the stakes are real - money, messages,
              irreversible actions - you need something stronger.
            </p>
            <p>
              {BRAND_NAME} is that something. It sits outside the AI, between the
              agent and the action. When an agent wants to spend money, send a
              message, or do anything you cannot undo, it has to go through{" "}
              {BRAND_NAME}. The action is held until you approve it. If you do not
              approve, nothing happens.
            </p>

            <div className="rounded-2xl p-6" style={{ background: PANEL }}>
              <h2 className="text-lg font-semibold" style={{ color: INK }}>
                How it works
              </h2>
              <div className="mt-4 space-y-4 text-[15px]" style={{ color: INK, lineHeight: 1.7 }}>
                <p>
                  You create a profile with your preferences - dietary needs,
                  budget, scheduling preferences, communication style. Each
                  section has its own visibility: public, link-only, or private.
                </p>
                <p>
                  You get a link and bearer tokens. Any MCP-compatible AI
                  assistant can read the sections you allow. When it wants to act,
                  it calls the approval endpoint and waits for your yes or no.
                </p>
                <p>
                  Every read and every approval is logged. You see exactly what
                  was accessed, by which agent, and when.
                </p>
              </div>
            </div>

            <h2 className="!mt-12 text-xl font-semibold" style={{ color: INK, letterSpacing: "-0.01em" }}>
              What we believe
            </h2>
            <p>
              <strong>Humans should stay in the loop.</strong> Not because AI is
              bad, but because delegation without oversight is not delegation - it
              is abdication. The best assistants are the ones you can trust, and
              trust is built through transparency and control.
            </p>
            <p>
              <strong>Permissions should be infrastructure, not prompts.</strong>{" "}
              A permission system has to sit outside the model. If the model can
              bypass it, it is not a permission system - it is a hope.
            </p>
            <p>
              <strong>Open source is non-negotiable.</strong> If you are trusting
              a service with your spending limits and personal preferences, you
              should be able to read every line of code. You should be able to
              self-host it. {BRAND_NAME} is open source and will stay that way.
            </p>
            <p>
              <strong>Start simple.</strong> Seven sections. Three visibility
              levels. One approval inbox. That is it. We will add complexity only
              when users ask for it, and only in ways that make the simple case
              simpler.
            </p>

            <h2 className="!mt-12 text-xl font-semibold" style={{ color: INK, letterSpacing: "-0.01em" }}>
              The team
            </h2>
            <p>
              {BRAND_NAME} is built by a small team that believes AI agents will
              change how people manage their daily lives - and that the trust
              layer between humans and agents is missing infrastructure, not a
              feature request. We are building the layer.
            </p>

            <div className="!mt-10 rounded-2xl p-6 text-center" style={{ background: PANEL }}>
              <p className="text-[15px]" style={{ color: MUTE }}>
                Questions? Ideas? Want to contribute?
              </p>
              <p className="mt-1 text-[15px]">
                <a href="mailto:hello@usegate.dev" className="underline" style={{ color: INK }}>
                  hello@usegate.dev
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
