// Telegram bot webhook + daily digest for Gate.
//   POST /functions/v1/telegram          - Telegram Update webhook
//   POST /functions/v1/telegram/digest   - daily digest fan-out (cron-driven)
//
// verify_jwt is off for this function (see supabase/config.toml): Telegram does
// not send a Supabase JWT. We instead validate Telegram's secret-token header
// when TELEGRAM_WEBHOOK_SECRET is configured. Uses the service-role client like
// ../mcp/index.ts.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { BRAND_NAME } from "../_shared/brand.ts";
import {
  type ApprovalRecord,
  escapeHtml,
  formatDigest,
  isAutoApproved,
  outcomeLabel,
  parseCallback,
  parseStartCommand,
  routeFromPath,
} from "./bot.ts";

const supabase: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

// ---------------------------------------------------------------------------
// Telegram Bot API helper
// ---------------------------------------------------------------------------

/** POST to https://api.telegram.org/bot<token>/<method>. Never throws. */
async function tgApi(method: string, body: Record<string, unknown>): Promise<void> {
  if (!BOT_TOKEN) {
    console.error(`tgApi skipped (${method}): TELEGRAM_BOT_TOKEN is unset`);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`tgApi ${method} failed: ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.error(`tgApi ${method} threw`, e);
  }
}

// ---------------------------------------------------------------------------
// Minimal Telegram Update shapes (only the fields we read)
// ---------------------------------------------------------------------------

interface TgChat {
  id: number;
}
interface TgMessage {
  message_id: number;
  chat: TgChat;
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  data?: string;
  message?: TgMessage;
}
interface TgUpdate {
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// ---------------------------------------------------------------------------
// Webhook: /start <code>
// ---------------------------------------------------------------------------

async function handleStart(message: TgMessage, code: string): Promise<void> {
  const chatId = String(message.chat.id);

  if (!code) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text:
        `Open ${BRAND_NAME} settings and use your personal connect link to ` +
        `link this chat.`,
    });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, handle")
    .eq("tg_connect_code", code)
    .maybeSingle();

  if (error) {
    console.error("start lookup failed", error);
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Something went wrong linking this chat. Please try again.",
    });
    return;
  }

  const user = data as { id: string; handle: string } | null;
  if (!user) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "That connect code is unknown. Grab a fresh link from your " +
        `${BRAND_NAME} settings.`,
    });
    return;
  }

  const { error: updErr } = await supabase
    .from("users")
    .update({ tg_chat_id: chatId })
    .eq("id", user.id);
  if (updErr) {
    console.error("start update failed", updErr);
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Something went wrong linking this chat. Please try again.",
    });
    return;
  }

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: `Connected - ${user.handle}. Approval requests will reach you here.`,
  });
}

// ---------------------------------------------------------------------------
// Webhook: inline-button callbacks (a:<id> / d:<id> / aa:<id>)
// ---------------------------------------------------------------------------

async function handleCallback(cb: TgCallbackQuery): Promise<void> {
  const parsed = cb.data ? parseCallback(cb.data) : null;
  if (!parsed || !cb.message) {
    await tgApi("answerCallbackQuery", { callback_query_id: cb.id });
    return;
  }
  const { action, approvalId } = parsed;
  const chatId = String(cb.message.chat.id);

  // The chat must belong to a connected user, and the approval must be theirs -
  // one human cannot resolve another's approval.
  const { data: userData, error: userErr } = await supabase
    .from("users")
    .select("id")
    .eq("tg_chat_id", chatId)
    .maybeSingle();
  if (userErr) console.error("callback user lookup failed", userErr);
  const user = userData as { id: string } | null;
  if (!user) {
    await tgApi("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "This chat isn't connected.",
      show_alert: true,
    });
    return;
  }

  const { data: apprData, error: apprErr } = await supabase
    .from("approvals")
    .select("id, user_id, action_desc, amount, currency, category, status, ts, resolved_ts")
    .eq("id", approvalId)
    .maybeSingle();
  if (apprErr) console.error("callback approval lookup failed", apprErr);
  const approval = apprData as ApprovalRecord | null;

  if (!approval || approval.user_id !== user.id) {
    await tgApi("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "That approval isn't available.",
      show_alert: true,
    });
    return;
  }

  // Idempotent: only resolve if currently pending; otherwise report status.
  if (approval.status !== "pending") {
    await tgApi("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: `Already ${approval.status}.`,
    });
    await finalizeMessage(cb.message, `Already ${approval.status}`);
    return;
  }

  const nowIso = new Date().toISOString();
  const newStatus = action === "d" ? "denied" : "approved";

  const { error: updErr } = await supabase
    .from("approvals")
    .update({ status: newStatus, resolved_ts: nowIso })
    .eq("id", approval.id)
    .eq("status", "pending"); // guard against a concurrent resolver
  if (updErr) {
    console.error("callback approval update failed", updErr);
    await tgApi("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "Couldn't update - try again.",
      show_alert: true,
    });
    return;
  }

  // "Always allow <category>" also persists a rule (only when a category exists).
  if (action === "aa" && approval.category) {
    const { error: ruleErr } = await supabase.from("rules").insert({
      user_id: approval.user_id,
      rule: { type: "always_allow", match: { category: approval.category } },
    });
    if (ruleErr) console.error("always_allow rule insert failed", ruleErr);
  }

  const label = outcomeLabel(action, approval.category);
  await tgApi("answerCallbackQuery", { callback_query_id: cb.id, text: label });
  await finalizeMessage(cb.message, label);
}

/** Append the outcome to the message and drop the inline keyboard. */
async function finalizeMessage(message: TgMessage, label: string): Promise<void> {
  const base = message.text ? escapeHtml(message.text) : "";
  await tgApi("editMessageText", {
    chat_id: String(message.chat.id),
    message_id: message.message_id,
    text: base ? `${base}\n\n- ${label}` : `- ${label}`,
    parse_mode: "HTML",
    // Omitting reply_markup removes the inline keyboard.
  });
}

// ---------------------------------------------------------------------------
// Webhook entry
// ---------------------------------------------------------------------------

async function handleWebhook(req: Request): Promise<Response> {
  // Validate Telegram's secret-token header when a secret is configured.
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    // Malformed body - ack with 200 so Telegram doesn't retry forever.
    return new Response("ok", { status: 200 });
  }

  try {
    if (update.message?.text) {
      const code = parseStartCommand(update.message.text);
      if (code !== null) {
        await handleStart(update.message, code);
      }
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (e) {
    // Never surface an error to Telegram - it retries non-200 responses.
    console.error("webhook handler error", e);
  }

  return new Response("ok", { status: 200 });
}

// ---------------------------------------------------------------------------
// Digest endpoint
// ---------------------------------------------------------------------------
//
// Meant to be invoked by a scheduler (pg_cron or an external cron), e.g. once
// daily. v1 sends a single digest to every connected user in one call. True
// 09:00-local targeting would instead run hourly and filter to users whose
// LOCAL hour == 9 using their `tz` column; that refinement is intentionally
// deferred. Guarded by TELEGRAM_WEBHOOK_SECRET (header or ?secret=) when set.

const DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

interface DigestUser {
  id: string;
  handle: string;
  tg_chat_id: string | null;
  quiet_hours_enabled: boolean;
}

async function handleDigest(req: Request): Promise<Response> {
  if (WEBHOOK_SECRET) {
    const url = new URL(req.url);
    const got = req.headers.get("x-telegram-bot-api-secret-token") ??
      url.searchParams.get("secret");
    if (got !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const { data: usersData, error: usersErr } = await supabase
    .from("users")
    .select("id, handle, tg_chat_id, quiet_hours_enabled")
    .not("tg_chat_id", "is", null);
  if (usersErr) {
    console.error("digest user query failed", usersErr);
    return new Response("error", { status: 500 });
  }

  const users = (usersData ?? []) as DigestUser[];
  const cutoff = new Date(Date.now() - DIGEST_WINDOW_MS).toISOString();
  let sent = 0;

  for (const user of users) {
    if (!user.tg_chat_id) continue;
    // quiet_hours_enabled === false means the human opted out of batching.
    if (user.quiet_hours_enabled === false) continue;

    const { data: apprData, error: apprErr } = await supabase
      .from("approvals")
      .select("id, user_id, action_desc, amount, currency, category, status, ts, resolved_ts")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("ts", cutoff)
      .order("ts", { ascending: false });
    if (apprErr) {
      console.error("digest approvals query failed", apprErr);
      continue;
    }

    const autoApproved = ((apprData ?? []) as ApprovalRecord[]).filter(isAutoApproved);
    if (autoApproved.length === 0) continue;

    await tgApi("sendMessage", {
      chat_id: user.tg_chat_id,
      text: formatDigest(user.handle, autoApproved),
      parse_mode: "HTML",
    });
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, digests_sent: sent }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

Deno.serve((req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
  const route = routeFromPath(new URL(req.url).pathname);
  if (route === "digest") return handleDigest(req);
  if (route === "webhook") return handleWebhook(req);
  return new Response("Not Found", { status: 404 });
});
