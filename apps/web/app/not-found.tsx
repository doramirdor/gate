import Link from "next/link";
import { BRAND_NAME } from "@shared/brand";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="h-8 w-8 text-ink-muted" />
      <p className="mt-6 text-lg font-medium text-ink">
        There is no {BRAND_NAME.toLowerCase()} here.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg border border-line bg-transparent px-4 text-sm font-medium text-ink transition-colors hover:bg-surface"
      >
        Go home
      </Link>
    </main>
  );
}
