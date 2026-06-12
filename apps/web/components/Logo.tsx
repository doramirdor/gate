/** Inline gate mark - geometry mirrors /public/brand/mark.svg, inherits currentColor. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 5h17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M6.5 5v15.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17.5 5v15.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2.25" fill="currentColor" />
    </svg>
  );
}
