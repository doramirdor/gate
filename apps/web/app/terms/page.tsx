import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, DOMAIN, SITE_URL } from "@shared/brand";
import { MarketingShell } from "@/components/MarketingShell";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";

export const metadata: Metadata = {
  title: `Terms of Service - ${BRAND_NAME}`,
  description: `Terms of service for ${BRAND_NAME}. Plain language, no surprises.`,
  openGraph: {
    title: `Terms of Service - ${BRAND_NAME}`,
    url: `${SITE_URL}/terms`,
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold" style={{ color: INK }}>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px]" style={{ color: INK, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-3xl px-6">
        <section className="pb-8 pt-16 sm:pt-24">
          <h1
            className="font-semibold"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Terms of Service
          </h1>
          <p className="mt-4 text-sm" style={{ color: MUTE }}>
            Last updated: June 1, 2025
          </p>
        </section>

        <section className="pb-24" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="pt-8">
            <p className="text-[15px]" style={{ color: INK, lineHeight: 1.7 }}>
              These terms govern your use of {BRAND_NAME} at {DOMAIN} and any
              related services. By creating an account, you agree to these terms.
              If you do not agree, do not use the service.
            </p>
          </div>

          <Section title="The service">
            <p>
              {BRAND_NAME} provides a permission layer between you and AI agents
              that act on your behalf. You create a profile with your preferences,
              generate bearer tokens for agents, and review approval requests
              through the web inbox or Telegram notifications.
            </p>
            <p>
              {BRAND_NAME} does not directly execute actions (purchases, messages,
              bookings). Those actions are carried out by the AI agents you
              connect. {BRAND_NAME} holds and gates those actions based on your
              approval.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              You are responsible for maintaining the security of your account.
              This includes keeping your bearer tokens confidential. If you
              believe a token has been compromised, revoke it immediately from the
              Settings page.
            </p>
            <p>
              You must provide accurate information when creating your account.
              One person, one account. Automated account creation is not allowed.
            </p>
          </Section>

          <Section title="Your data">
            <p>
              You own the data you put into {BRAND_NAME} - your profile sections,
              your rules, your approval history. We do not claim any rights to
              your content.
            </p>
            <p>
              You grant us the right to store and serve your profile data to
              agents that present valid tokens, according to the visibility and
              scope settings you configure. This is the core function of the
              service.
            </p>
            <p>
              See our{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              for details on data handling.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul className="ml-5 space-y-1" style={{ listStyleType: "disc" }}>
              <li>Use {BRAND_NAME} for any illegal purpose.</li>
              <li>Abuse the API or MCP endpoint with excessive or malicious requests.</li>
              <li>Impersonate another person or claim a handle that is not yours.</li>
              <li>Attempt to access another user&apos;s data or tokens.</li>
              <li>Use the service to harm, harass, or defraud others.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these terms.
            </p>
          </Section>

          <Section title="Agent actions">
            <p>
              {BRAND_NAME} is a gating layer, not an agent. When you approve an
              action through {BRAND_NAME}, the responsibility for that action lies
              with you and the AI agent that requested it. We do not control what
              agents do after receiving approval, and we are not liable for the
              outcomes of approved actions.
            </p>
            <p>
              Auto-approve rules you configure are your responsibility. If you set
              a rule to always allow a category, actions in that category will
              proceed without manual review.
            </p>
          </Section>

          <Section title="Availability">
            <p>
              We aim to keep {BRAND_NAME} available at all times, but we do not
              guarantee uninterrupted service. We may take the service down for
              maintenance, and we are not responsible for downtime caused by
              factors outside our control.
            </p>
            <p>
              If the {BRAND_NAME} service is unreachable, properly implemented
              agents should fail closed - denying the action rather than
              proceeding without approval.
            </p>
          </Section>

          <Section title="Open source">
            <p>
              The {BRAND_NAME} codebase is open source. You may self-host the
              software under the terms of its license. These Terms of Service
              apply to the hosted service at {DOMAIN}, not to self-hosted
              instances.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              {BRAND_NAME} is provided &quot;as is&quot; without warranties of any kind. To
              the maximum extent permitted by law, we are not liable for any
              indirect, incidental, or consequential damages arising from your use
              of the service, including damages resulting from agent actions you
              approved.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms. Material changes will be communicated via
              email at least 14 days before they take effect. Continued use of the
              service after the effective date constitutes acceptance.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms? Email{" "}
              <a href="mailto:legal@usegate.dev" className="underline">
                legal@usegate.dev
              </a>.
            </p>
          </Section>
        </section>
      </div>
    </MarketingShell>
  );
}
