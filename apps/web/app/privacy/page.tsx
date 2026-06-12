import type { Metadata } from "next";
import { BRAND_NAME, DOMAIN, SITE_URL } from "@shared/brand";
import { MarketingShell } from "@/components/MarketingShell";

const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";

export const metadata: Metadata = {
  title: `Privacy Policy - ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} handles your data. The short version: we collect as little as possible and never sell it.`,
  openGraph: {
    title: `Privacy Policy - ${BRAND_NAME}`,
    url: `${SITE_URL}/privacy`,
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

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm" style={{ color: MUTE }}>
            Last updated: June 1, 2025
          </p>
        </section>

        <section className="pb-24" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="pt-8">
            <p className="text-[15px]" style={{ color: INK, lineHeight: 1.7 }}>
              {BRAND_NAME} (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates the {DOMAIN} website
              and the {BRAND_NAME} service. This policy explains what data we
              collect, why, and what we do with it. The short version: we collect
              as little as possible and never sell your data.
            </p>
          </div>

          <Section title="What we collect">
            <p>
              <strong>Account information.</strong> When you sign up, we store
              your email address and the handle you choose. We use Supabase Auth
              for authentication, which stores a hashed session token.
            </p>
            <p>
              <strong>Profile data.</strong> The sections you fill in - about,
              scheduling, dietary, sizes, budget, communication style, and custom
              notes. You control the visibility of each section (public,
              link-only, or private).
            </p>
            <p>
              <strong>Agent tokens.</strong> Bearer tokens you create for AI
              agents, including their scopes and revocation status.
            </p>
            <p>
              <strong>Approval requests.</strong> When an agent requests approval,
              we store the request details (category, description, amount) and
              your response (approved, denied, or expired).
            </p>
            <p>
              <strong>Audit logs.</strong> Every time an agent reads your profile
              or requests an approval, we log the event with a timestamp, the
              token used, and the sections or action involved.
            </p>
            <p>
              <strong>Telegram chat ID.</strong> If you connect Telegram
              notifications, we store your Telegram chat ID to send you approval
              notifications.
            </p>
          </Section>

          <Section title="What we do not collect">
            <p>
              We do not use analytics trackers, advertising pixels, or
              third-party cookies. We do not collect your browsing behavior, IP
              address history, or device fingerprints beyond what is necessary for
              standard HTTPS connections.
            </p>
          </Section>

          <Section title="How we use your data">
            <p>
              Your profile data is served to AI agents that present a valid bearer
              token with the appropriate scopes. Only the sections permitted by
              the token&apos;s scopes and each section&apos;s visibility setting are
              shared.
            </p>
            <p>
              Audit logs exist for your benefit. They let you see who accessed
              your data and when.
            </p>
            <p>
              We use your email to send you transactional messages (account
              security, service updates). We will not send marketing emails
              without your explicit opt-in.
            </p>
          </Section>

          <Section title="Data sharing">
            <p>
              We do not sell, rent, or share your personal data with third
              parties, except:
            </p>
            <ul className="ml-5 space-y-1" style={{ listStyleType: "disc" }}>
              <li>To provide the service (e.g., Supabase for database hosting and auth).</li>
              <li>When required by law or to protect our rights.</li>
              <li>When you explicitly connect a third-party service (e.g., Telegram for notifications).</li>
            </ul>
          </Section>

          <Section title="Data storage and security">
            <p>
              Your data is stored in a Supabase-hosted PostgreSQL database with
              row-level security (RLS) enabled on every table. All data is
              encrypted in transit (TLS) and at rest. Agent tokens are
              cryptographically strong UUIDs.
            </p>
          </Section>

          <Section title="Data deletion">
            <p>
              You can delete your account and all associated data from the
              Settings page. Deletion is permanent and irreversible. We remove
              your profile, tokens, approval history, and audit logs.
            </p>
          </Section>

          <Section title="Self-hosting">
            <p>
              {BRAND_NAME} is open source. If you prefer to keep your data
              entirely on your own infrastructure, you can self-host the full
              stack. See the project README for instructions.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. Material changes will
              be communicated via email. The &quot;last updated&quot; date at the top
              reflects the most recent revision.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy? Email us at{" "}
              <a href="mailto:privacy@usegate.dev" className="underline">
                privacy@usegate.dev
              </a>.
            </p>
          </Section>
        </section>
      </div>
    </MarketingShell>
  );
}
