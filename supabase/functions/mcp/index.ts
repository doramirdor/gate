// MCP Streamable HTTP endpoint: POST /functions/v1/mcp/{handle}
// Agents authenticate with a bearer token from the tokens table
// (verify_jwt is off for this function - see supabase/config.toml).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type ApprovalRow,
  type Db,
  handleHttp,
  type NotifyPayload,
  type RuleRow,
  type TokenRow,
  type UserRow,
} from "./handlers.ts";
import type { Sections } from "../_shared/profile.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const db: Db = {
  async getToken(id) {
    const { data, error } = await supabase
      .from("tokens")
      .select("id, user_id, scopes, revoked_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as TokenRow | null;
  },

  async getUserByHandle(handle) {
    const { data, error } = await supabase
      .from("users")
      .select("id, handle")
      .eq("handle", handle)
      .maybeSingle();
    if (error) throw error;
    return data as UserRow | null;
  },

  async getSections(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("sections")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.sections ?? {}) as Sections;
  },

  async insertRead(read) {
    const { error } = await supabase.from("reads").insert(read);
    if (error) throw error;
  },

  async getRules(userId) {
    const { data, error } = await supabase
      .from("rules")
      .select("rule")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as RuleRow[];
  },

  async insertApproval(approval) {
    const { data, error } = await supabase
      .from("approvals")
      .insert(approval)
      .select("id, user_id, status, ts")
      .single();
    if (error) throw error;
    return data as ApprovalRow;
  },

  async getApproval(id) {
    const { data, error } = await supabase
      .from("approvals")
      .select("id, user_id, status, ts")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as ApprovalRow | null;
  },

  async setApprovalStatus(id, status, resolved_ts) {
    const { error } = await supabase
      .from("approvals")
      .update({ status, resolved_ts })
      .eq("id", id);
    if (error) throw error;
  },

  async updateSections(userId, sections) {
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, sections });
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// Telegram push: when an approval goes PENDING, notify the human in-chat with
// inline Approve / Deny / Always-allow buttons. The bot (supabase/functions/
// telegram) handles the button callbacks. Failures here are swallowed by the
// caller in handlers.ts - a missed push must never change the tool response.
// ---------------------------------------------------------------------------

/** Escape text for Telegram HTML parse_mode. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function notify(payload: NotifyPayload): Promise<void> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("notify skipped: TELEGRAM_BOT_TOKEN is unset");
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .select("tg_chat_id")
    .eq("id", payload.user_id)
    .maybeSingle();
  if (error) throw error;

  const chatId = (data as { tg_chat_id: string | null } | null)?.tg_chat_id;
  if (!chatId) {
    // Human hasn't connected Telegram - nothing to push to.
    return;
  }

  const lines = [
    `<b>Approval needed</b> for <b>${escapeHtml(payload.handle)}</b>`,
    "",
    escapeHtml(payload.action_desc),
  ];
  if (payload.amount !== null) {
    const money = payload.currency
      ? `${payload.amount} ${escapeHtml(payload.currency)}`
      : String(payload.amount);
    lines.push(`Amount: <b>${escapeHtml(money)}</b>`);
  }
  if (payload.category) {
    lines.push(`Category: ${escapeHtml(payload.category)}`);
  }
  if (payload.agent_ua) {
    lines.push(`Agent: ${escapeHtml(payload.agent_ua)}`);
  }

  const buttons: { text: string; callback_data: string }[][] = [
    [
      { text: "Approve", callback_data: `a:${payload.approval_id}` },
      { text: "Deny", callback_data: `d:${payload.approval_id}` },
    ],
  ];
  if (payload.category) {
    buttons.push([
      {
        text: `Always allow ${payload.category}`,
        callback_data: `aa:${payload.approval_id}`,
      },
    ]);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: buttons },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Telegram sendMessage failed: ${res.status} ${await res.text()}`,
    );
  }
}

async function checkRateLimit(tokenId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_token_id: tokenId,
  });
  if (error) {
    console.error("rate limit check failed", error);
    return true;
  }
  return data === true;
}

Deno.serve((req) =>
  handleHttp(req, { db, now: () => Date.now(), notify, checkRateLimit })
);
