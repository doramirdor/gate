import Link from "next/link";
import { BRAND_NAME } from "@shared/brand";
import { Logo } from "./Logo";

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", system-ui, sans-serif';
const INK = "#1d1d1f";
const MUTE = "#6e6e73";
const LINE = "rgba(0,0,0,0.09)";
const WHITE = "#ffffff";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: WHITE, color: INK, fontFamily: FONT }}>
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2" style={{ color: INK }}>
            <Logo className="h-5 w-5" />
            <span className="text-[15px] font-semibold tracking-tight">
              {BRAND_NAME.toLowerCase()}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden h-9 items-center px-1 text-sm font-medium sm:inline-flex" style={{ color: MUTE }}>
              Blog
            </Link>
            <Link href="/login" className="hidden h-9 items-center rounded-full px-4 text-sm font-medium sm:inline-flex" style={{ color: INK }}>
              Sign in
            </Link>
            <Link
              href="/login"
              className="lp-press inline-flex h-9 items-center rounded-full px-4 text-sm font-medium"
              style={{ background: INK, color: WHITE }}
            >
              Get your link
            </Link>
          </div>
        </header>
      </div>

      {children}

      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2" style={{ color: INK }}>
                <Logo className="h-4 w-4" />
                <span className="font-semibold">{BRAND_NAME.toLowerCase()}</span>
              </div>
              <p className="mt-2 text-sm" style={{ color: MUTE }}>
                Let AI act for you. Keep the final say.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Product</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/#how" className="text-sm hover:underline" style={{ color: INK }}>How it works</Link>
                <Link href="/#faq" className="text-sm hover:underline" style={{ color: INK }}>FAQ</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Resources</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/blog" className="text-sm hover:underline" style={{ color: INK }}>Blog</Link>
                <Link href="/about" className="text-sm hover:underline" style={{ color: INK }}>About</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTE }}>Legal</h4>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/privacy" className="text-sm hover:underline" style={{ color: INK }}>Privacy</Link>
                <Link href="/terms" className="text-sm hover:underline" style={{ color: INK }}>Terms</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t pt-6" style={{ borderColor: LINE }}>
            <p className="text-sm" style={{ color: MUTE }}>
              &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
