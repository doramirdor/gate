export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Route names and confusables that can never be claimed. */
export const RESERVED_HANDLES = new Set([
  "about",
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "blog",
  "brand",
  "claim",
  "docs",
  "editor",
  "functions",
  "gate",
  "help",
  "inbox",
  "log",
  "login",
  "logout",
  "mcp",
  "me",
  "new",
  "onboarding",
  "pricing",
  "privacy",
  "profile",
  "profiles",
  "public",
  "settings",
  "signout",
  "static",
  "status",
  "support",
  "terms",
  "token",
  "tokens",
  "usegate",
  "user",
  "users",
  "www",
  "you",
]);

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateHandle(
  raw: string,
): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = normalizeHandle(raw);
  if (handle.length < 2) return { ok: false, error: "At least 2 characters." };
  if (handle.length > 32) return { ok: false, error: "At most 32 characters." };
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: "Lowercase letters, digits, and inner hyphens only.",
    };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "That one is taken." };
  }
  return { ok: true, handle };
}
