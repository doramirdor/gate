// Pure, dependency-free helpers for the Telegram bot edge function.
// HTTP/Supabase/Telegram-API wiring lives in index.ts; everything here is
// synchronous and unit-testable so the routing and parsing rules can be
// reasoned about in isolation. Mirrors the handlers.ts / index.ts split used
// by the MCP function.

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Auto-approve sets resolved_ts at insert time, so an auto-approved row has
 * resolved_ts within a hair of ts. Manual approvals resolve seconds-to-minutes
 * later. We treat anything resolved within this window as auto-approved.
 */
export const AUTO_APPROVE_WINDOW_MS = 3000;

/** Escape text for Telegram's HTML parse_mode (only &, <, > are special). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type Route = "webhook" | "digest" | "unknown";

/**
 * Route by URL path regardless of gateway prefix.
 *   POST /functions/v1/telegram         -> "webhook"
 *   POST /functions/v1/telegram/digest  -> "digest"
 * Mirrors handleFromPath() in ../mcp/handlers.ts.
 */
export function routeFromPath(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("telegram");
  if (idx < 0) return "unknown";
  const next = parts[idx + 1];
  if (next === undefined) return "webhook";
  if (next === "digest") return "digest";
  return "unknown";
}

/**
 * Extract the connect code from a "/start <code>" message. Tolerates the
 * "/start@BotName <code>" form Telegram uses in groups. Returns null when the
 * message isn't a /start command. The code itself is returned verbatim (it may
 * be an unknown/garbage value - the caller decides).
 */
export function parseStartCommand(text: string): string | null {
  const tokens = text.trim().split(/\s+/);
  const cmd = tokens[0]?.split("@")[0];
  if (cmd !== "/start") return null;
  return tokens[1] ?? "";
}

export type CallbackAction = "a" | "d" | "aa";

export interface ParsedCallback {
  action: CallbackAction;
  approvalId: string;
}

/** Parse inline-button callback_data: "a:<id>" | "d:<id>" | "aa:<id>". */
export function parseCallback(data: string): ParsedCallback | null {
  const sep = data.indexOf(":");
  if (sep < 0) return null;
  const prefix = data.slice(0, sep);
  const approvalId = data.slice(sep + 1);
  if (prefix !== "a" && prefix !== "d" && prefix !== "aa") return null;
  if (!UUID_RE.test(approvalId)) return null;
  return { action: prefix, approvalId };
}

export interface ApprovalRecord {
  id: string;
  user_id: string;
  action_desc: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  status: string;
  ts: string;
  resolved_ts: string | null;
}

/** Auto-approved heuristic: approved with resolved_ts ~ ts (set at insert). */
export function isAutoApproved(a: ApprovalRecord): boolean {
  if (a.status !== "approved" || !a.resolved_ts) return false;
  const delta = Math.abs(Date.parse(a.resolved_ts) - Date.parse(a.ts));
  return Number.isFinite(delta) && delta <= AUTO_APPROVE_WINDOW_MS;
}

/** One human-readable line for an approval in the digest. */
export function approvalLine(a: ApprovalRecord): string {
  let line = `• ${escapeHtml(a.action_desc)}`;
  if (a.amount !== null) {
    const money = a.currency
      ? `${a.amount} ${escapeHtml(a.currency)}`
      : String(a.amount);
    line += ` - ${escapeHtml(money)}`;
  }
  if (a.category) line += ` [${escapeHtml(a.category)}]`;
  return line;
}

/** Compose the daily digest body for a set of auto-approved approvals. */
export function formatDigest(handle: string, autoApproved: ApprovalRecord[]): string {
  const header =
    `<b>Daily digest for ${escapeHtml(handle)}</b>\n` +
    `${autoApproved.length} action(s) auto-approved in the last 24h:`;
  return [header, "", ...autoApproved.map(approvalLine)].join("\n");
}

/** Result label appended to a resolved approval message, and the toast text. */
export function outcomeLabel(
  action: CallbackAction,
  category: string | null,
): string {
  if (action === "d") return "Denied";
  if (action === "aa" && category) return `Approved - always allow ${category}`;
  return "Approved";
}
