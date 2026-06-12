import Link from "next/link";
import { BRAND_NAME } from "@shared/brand";
import { Logo } from "./Logo";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink"
    >
      {children}
    </Link>
  );
}

/** Shared chrome for signed-in pages (editor, settings, onboarding done). */
export function AppShell({
  handle,
  children,
}: {
  handle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-line py-5">
        <Link href="/editor" className="flex items-center gap-2 text-ink">
          <Logo className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight">
            {BRAND_NAME.toLowerCase()}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/editor">Editor</NavLink>
          <NavLink href="/inbox">Inbox</NavLink>
          <NavLink href="/log">Log</NavLink>
          <NavLink href="/settings">Settings</NavLink>
          {handle ? <NavLink href={`/${handle}`}>Your link</NavLink> : null}
          <form action="/auth/signout" method="post" className="ml-2">
            <button className="rounded-md px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main className="flex-1 py-10">{children}</main>
    </div>
  );
}
