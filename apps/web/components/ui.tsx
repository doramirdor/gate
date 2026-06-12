import type { ComponentProps } from "react";

export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-ink text-bg hover:opacity-90",
  accent: "bg-accent text-[#1a1206] hover:brightness-105",
  ghost: "border border-line bg-transparent text-ink hover:bg-surface",
  danger: "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
} as const;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-[opacity,background-color,filter] disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-xl border border-line bg-surface p-6", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-ink-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cx("mb-1.5 block text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "border-line text-ink-muted",
  amber: "border-accent/40 bg-accent/10 text-accent",
  green: "border-success/40 bg-success/10 text-success",
  red: "border-danger/40 bg-danger/10 text-danger",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Token / URL display: monospace, selectable, quietly boxed. */
export function Mono({ className, ...props }: ComponentProps<"code">) {
  return (
    <code
      className={cx(
        "select-all break-all rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-ink",
        className,
      )}
      {...props}
    />
  );
}
