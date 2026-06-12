// MCP server core for /functions/v1/mcp/{handle}.
// Pure logic with injected persistence (Db) and clock so the test suite in
// ../tests/ runs without a live database. HTTP/Supabase wiring is in index.ts.

import { BRAND_NAME, CONTEXT_FOOTER } from "../_shared/brand.ts";
import {
  canWriteSection,
  isSectionKey,
  permittedSectionKeys,
  renderProfileMarkdown,
  requestedSectionKeys,
  sanitizeSections,
  SECTION_KEYS,
  SECTION_LABELS,
  type SectionKey,
  type Sections,
  writableSectionKeys,
} from "../_shared/profile.ts";

export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const APPROVAL_TTL_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Persistence interface
// ---------------------------------------------------------------------------

export interface TokenRow {
  id: string;
  user_id: string;
  scopes: string[];
  revoked_at: string | null;
}

export interface UserRow {
  id: string;
  handle: string;
}

export interface RuleRow {
  rule: { type: string; [key: string]: unknown };
}

export interface ApprovalRow {
  id: string;
  user_id: string;
  status: string;
  ts: string;
}

export interface NewApproval {
  user_id: string;
  agent_ua: string | null;
  action_desc: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  status: "pending" | "approved";
  resolved_ts: string | null;
}

export interface Db {
  getToken(id: string): Promise<TokenRow | null>;
  getUserByHandle(handle: string): Promise<UserRow | null>;
  getSections(userId: string): Promise<Sections>;
  insertRead(read: {
    token_id: string;
    agent_ua: string | null;
    scope_requested: string;
  }): Promise<void>;
  getRules(userId: string): Promise<RuleRow[]>;
  insertApproval(approval: NewApproval): Promise<ApprovalRow>;
  getApproval(id: string): Promise<ApprovalRow | null>;
  setApprovalStatus(
    id: string,
    status: string,
    resolved_ts: string | null,
  ): Promise<void>;
  updateSections(userId: string, sections: Sections): Promise<void>;
}

/** Payload pushed to the human when an approval lands in the pending state. */
export interface NotifyPayload {
  approval_id: string;
  user_id: string;
  handle: string;
  action_desc: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  agent_ua: string | null;
}

export interface Ctx {
  db: Db;
  now: () => number;
  /**
   * Optional out-of-band notifier (e.g. a Telegram push) invoked when a new
   * approval is left PENDING. Never invoked for auto-approved actions. Wiring
   * lives in index.ts; the test suite omits it, so it must stay optional.
   */
  notify?: (payload: NotifyPayload) => Promise<void>;
  /** Per-token rate limit check. Returns true if the request is allowed. */
  checkRateLimit?: (tokenId: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const TOOLS = [
  {
    name: "get_context",
    description:
      `Read this human's context before acting on their behalf. Returns the ` +
      `profile sections your token is permitted to see, as markdown. Call ` +
      `this at the start of a session.`,
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          description:
            `"public" (default) or "all" for everything your token permits, ` +
            `or a comma-separated list of section keys: ` +
            SECTION_KEYS.join(", ") + ".",
        },
      },
    },
  },
  {
    name: "request_approval",
    description:
      `Ask this human for permission BEFORE spending money, sending ` +
      `messages, or doing anything irreversible on their behalf. Returns ` +
      `"approved" immediately when the action is pre-cleared, otherwise ` +
      `"pending" - poll check_approval until it resolves. Pending requests ` +
      `expire after 15 minutes.`,
    inputSchema: {
      type: "object",
      properties: {
        action_desc: {
          type: "string",
          description: "Plain-language description of the action you want to take.",
        },
        amount: { type: "number", description: "Cost of the action, if it spends money." },
        currency: { type: "string", description: 'ISO currency code, e.g. "USD".' },
        category: {
          type: "string",
          description: 'Short category for the action, e.g. "groceries" or "email".',
        },
      },
      required: ["action_desc"],
    },
  },
  {
    name: "check_approval",
    description:
      `Check the status of a pending approval. Returns pending, approved, ` +
      `denied, or expired. Poll every few seconds while pending; stop on ` +
      `denied or expired.`,
    inputSchema: {
      type: "object",
      properties: {
        approval_id: { type: "string", description: "Id returned by request_approval." },
      },
      required: ["approval_id"],
    },
  },
  {
    name: "build_profile",
    description:
      `Bootstrap this human's profile by collecting information about them. ` +
      `Returns instructions on what to gather and from which sources, scoped ` +
      `to the sections your token can write. After collecting, call ` +
      `update_profile with the results. Requires write access to at least ` +
      `one section.`,
    inputSchema: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          description:
            `Optional comma-separated list of sections to focus on: ` +
            SECTION_KEYS.join(", ") +
            `. Omit to build the full profile.`,
        },
      },
    },
  },
  {
    name: "update_profile",
    description:
      `Update this human's profile sections. Provide the sections you want ` +
      `to set or replace — omitted sections are left unchanged. Each section ` +
      `requires its own write scope ("write:<key>"); sections your token ` +
      `cannot write are skipped.`,
    inputSchema: {
      type: "object",
      properties: {
        sections: {
          type: "object",
          description:
            `Object of sections to update. Keys: ` +
            SECTION_KEYS.join(", ") +
            `. Each value: {content: string, visibility: "public"|"link"|"private"}.`,
        },
      },
      required: ["sections"],
    },
  },
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TOKEN_PREFIX = "gk_live_";

function stripTokenPrefix(raw: string): string {
  return raw.startsWith(TOKEN_PREFIX) ? raw.slice(TOKEN_PREFIX.length) : raw;
}

export interface AuthOk {
  ok: true;
  token: TokenRow;
  user: UserRow;
}

export interface AuthErr {
  ok: false;
  status: number;
  message: string;
}

export async function resolveAuth(
  bearer: string | null,
  handle: string,
  ctx: Ctx,
): Promise<AuthOk | AuthErr> {
  if (!bearer) {
    return { ok: false, status: 401, message: "Missing bearer token." };
  }
  const tokenId = stripTokenPrefix(bearer);
  if (!UUID_RE.test(tokenId)) {
    return { ok: false, status: 401, message: "Malformed bearer token." };
  }
  const token = await ctx.db.getToken(tokenId);
  if (!token) {
    return { ok: false, status: 401, message: "Unknown token." };
  }
  if (token.revoked_at) {
    return { ok: false, status: 401, message: "This token has been revoked." };
  }
  const user = await ctx.db.getUserByHandle(handle);
  if (!user) {
    return { ok: false, status: 404, message: `No such handle: ${handle}` };
  }
  if (token.user_id !== user.id) {
    return {
      ok: false,
      status: 403,
      message: "This token does not belong to this handle.",
    };
  }
  return { ok: true, token, user };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

interface ToolOutcome {
  text: string;
  structured?: Record<string, unknown>;
  isError?: boolean;
}

async function getContext(
  args: Record<string, unknown>,
  auth: AuthOk,
  agentUa: string | null,
  ctx: Ctx,
): Promise<ToolOutcome> {
  const scopeArg = typeof args.scope === "string" ? args.scope : "public";
  const sections = await ctx.db.getSections(auth.user.id);
  const requested = requestedSectionKeys(scopeArg);
  const permitted = permittedSectionKeys(sections, auth.token.scopes);
  const served = requested === "all"
    ? permitted
    : requested.filter((key) => permitted.includes(key));
  const markdown = renderProfileMarkdown(auth.user.handle, sections, served);
  await ctx.db.insertRead({
    token_id: auth.token.id,
    agent_ua: agentUa,
    scope_requested: scopeArg,
  });
  return { text: markdown };
}

async function requestApproval(
  args: Record<string, unknown>,
  auth: AuthOk,
  agentUa: string | null,
  ctx: Ctx,
): Promise<ToolOutcome> {
  if (!auth.token.scopes.includes("approvals")) {
    return {
      text: 'This token lacks the "approvals" scope. Ask the human for a token that includes it.',
      isError: true,
    };
  }
  const actionDesc = typeof args.action_desc === "string"
    ? args.action_desc.trim()
    : "";
  if (!actionDesc) {
    return { text: "action_desc is required.", isError: true };
  }
  const amount =
    typeof args.amount === "number" && Number.isFinite(args.amount)
      ? args.amount
      : null;
  const currency = typeof args.currency === "string"
    ? args.currency.trim().toUpperCase()
    : null;
  const category = typeof args.category === "string"
    ? args.category.trim().toLowerCase()
    : null;

  const rules = await ctx.db.getRules(auth.user.id);

  let auto: "always_allow" | "spend_threshold" | null = null;
  if (category) {
    const allowed = rules.some((r) =>
      r.rule?.type === "always_allow" &&
      String(
        (r.rule as { match?: { category?: unknown } }).match?.category ?? "",
      ).toLowerCase() === category
    );
    if (allowed) auto = "always_allow";
  }
  if (!auto && amount !== null) {
    const threshold = rules.find((r) => r.rule?.type === "spend_threshold");
    if (threshold) {
      const limit = Number(threshold.rule.amount);
      const ruleCurrency = String(threshold.rule.currency ?? "").toUpperCase();
      const currencyOk = !currency || !ruleCurrency || currency === ruleCurrency;
      if (Number.isFinite(limit) && amount < limit && currencyOk) {
        auto = "spend_threshold";
      }
    }
  }

  const row = await ctx.db.insertApproval({
    user_id: auth.user.id,
    agent_ua: agentUa,
    action_desc: actionDesc,
    amount,
    currency,
    category,
    status: auto ? "approved" : "pending",
    resolved_ts: auto ? new Date(ctx.now()).toISOString() : null,
  });

  if (auto) {
    return {
      text: `Approved (${auto}). You may proceed: ${actionDesc}`,
      structured: { approval_id: row.id, status: "approved", auto },
    };
  }

  // Push the pending approval to the human out-of-band (e.g. Telegram).
  // A push failure must never change this tool's response.
  try {
    await ctx.notify?.({
      approval_id: row.id,
      user_id: auth.user.id,
      handle: auth.user.handle,
      action_desc: actionDesc,
      amount,
      currency,
      category,
      agent_ua: agentUa,
    });
  } catch (e) {
    console.error("notify failed", e);
  }

  return {
    text:
      `Pending human approval (id ${row.id}). Do NOT proceed. Poll ` +
      `check_approval until it returns approved; it expires in 15 minutes.`,
    structured: {
      approval_id: row.id,
      status: "pending",
      expires_in_seconds: APPROVAL_TTL_MS / 1000,
    },
  };
}

async function checkApproval(
  args: Record<string, unknown>,
  auth: AuthOk,
  ctx: Ctx,
): Promise<ToolOutcome> {
  if (!auth.token.scopes.includes("approvals")) {
    return {
      text: 'This token lacks the "approvals" scope.',
      isError: true,
    };
  }
  const id = typeof args.approval_id === "string" ? args.approval_id : "";
  if (!UUID_RE.test(id)) {
    return { text: "approval_id must be the id returned by request_approval.", isError: true };
  }
  const approval = await ctx.db.getApproval(id);
  if (!approval || approval.user_id !== auth.user.id) {
    return { text: "No such approval.", isError: true };
  }
  let status = approval.status;
  if (
    status === "pending" &&
    ctx.now() - Date.parse(approval.ts) > APPROVAL_TTL_MS
  ) {
    status = "expired";
    await ctx.db.setApprovalStatus(
      approval.id,
      "expired",
      new Date(ctx.now()).toISOString(),
    );
  }
  const guidance = status === "approved"
    ? "You may proceed."
    : status === "pending"
    ? "Do NOT proceed yet. Keep polling."
    : "Do NOT proceed. The human did not approve this action.";
  return {
    text: `Approval ${approval.id}: ${status}. ${guidance}`,
    structured: { approval_id: approval.id, status },
  };
}

const BUILD_PROFILE_INSTRUCTIONS: Record<SectionKey, { collect: string; sources: string; visibility: string }> = {
  identity: {
    collect: "Full name, role/title, location, how agents should address them, key personal details.",
    sources: "Ask the user directly. Check email signatures, LinkedIn, GitHub profile, or any connected identity provider.",
    visibility: "public",
  },
  scheduling: {
    collect: "Working hours, timezone, deep-work blocks, meeting preferences, days off, calendar quirks.",
    sources: "Check their calendar app for patterns. Look at meeting density, recurring blocks, typical start/end times.",
    visibility: "link",
  },
  dietary: {
    collect: "Allergies, intolerances, diets (vegan, kosher, etc.), strong dislikes, favorite cuisines.",
    sources: "Ask the user. Check food delivery history if accessible (Uber Eats, DoorDash).",
    visibility: "link",
  },
  sizes: {
    collect: "Clothing sizes (tops, bottoms), shoe size, fit preferences (slim, relaxed).",
    sources: "Ask the user directly — this is rarely available in apps.",
    visibility: "private",
  },
  budget: {
    collect: "Spending comfort zones per category (meals, travel, gifts), price ceilings, subscription tolerance.",
    sources: "Ask the user. If you have access to transaction history, infer typical ranges — but always confirm.",
    visibility: "private",
  },
  comms: {
    collect: "Preferred tone (formal/casual), sign-off style, communication channels, response time expectations, VIP contacts.",
    sources: "Analyze their email or message style if accessible. Check sent messages for patterns, signatures, and tone.",
    visibility: "link",
  },
  custom: {
    collect: "Preferred tech stack, tools, editors, conventions, hobbies, travel preferences, or anything else agents should know.",
    sources: "Ask the user. Check IDE settings, dotfiles, or project configs if accessible.",
    visibility: "link",
  },
};

async function buildProfile(
  args: Record<string, unknown>,
  auth: AuthOk,
  ctx: Ctx,
): Promise<ToolOutcome> {
  const writable = writableSectionKeys(auth.token.scopes);
  if (writable.length === 0) {
    return {
      text:
        "This token has no write access to any section. Ask the human for a " +
        "token with write access to the sections you need to build.",
      isError: true,
    };
  }

  const focusArg = typeof args.focus === "string" ? args.focus : "";
  const requestedKeys: SectionKey[] = focusArg
    ? focusArg.split(",").map((s) => s.trim()).filter((s): s is SectionKey => isSectionKey(s))
    : [...SECTION_KEYS];
  // Only instruct on sections this token can actually write.
  const focusKeys = requestedKeys.filter((k) => writable.includes(k));

  const existing = await ctx.db.getSections(auth.user.id);
  const filled = SECTION_KEYS.filter((k) => existing[k]?.content?.trim());

  const lines: string[] = [
    `# Build profile for ${auth.user.handle}`,
    "",
    "Collect information about this human and call `update_profile` with the results.",
    "Use everything you already know from this conversation, and pull from connected apps when possible.",
    "Ask the user to confirm or fill gaps — never guess on sensitive details (budget, dietary, sizes).",
    "",
  ];

  if (filled.length > 0) {
    lines.push(
      `Already filled: ${filled.map((k) => SECTION_LABELS[k]).join(", ")}. You can update these or focus on the empty ones.`,
      "",
    );
  }

  for (const key of focusKeys) {
    const info = BUILD_PROFILE_INSTRUCTIONS[key];
    if (!info) continue;
    const status = existing[key]?.content?.trim() ? "has content" : "empty";
    lines.push(
      `## ${SECTION_LABELS[key]} (${status})`,
      `**Collect:** ${info.collect}`,
      `**Sources:** ${info.sources}`,
      `**Default visibility:** ${info.visibility}`,
      "",
    );
  }

  lines.push(
    "---",
    "Once you have the information, call `update_profile` with a sections object.",
    "Each section: `{content: \"markdown string\", visibility: \"public\"|\"link\"|\"private\"}`.",
    "You can update one section at a time or all at once. Omitted sections are left unchanged.",
  );

  return { text: lines.join("\n") };
}

async function updateProfile(
  args: Record<string, unknown>,
  auth: AuthOk,
  ctx: Ctx,
): Promise<ToolOutcome> {
  const incoming = sanitizeSections(args.sections);
  const incomingKeys = Object.keys(incoming) as SectionKey[];
  if (incomingKeys.length === 0) {
    return { text: "No valid sections provided.", isError: true };
  }
  const allowedKeys = incomingKeys.filter((k) =>
    canWriteSection(auth.token.scopes, k)
  );
  const deniedKeys = incomingKeys.filter((k) => !allowedKeys.includes(k));
  if (allowedKeys.length === 0) {
    const denied = deniedKeys.map((k) => SECTION_LABELS[k]).join(", ");
    return {
      text:
        `This token cannot write ${denied}. Ask the human for a token with ` +
        `write access to ${deniedKeys.length === 1 ? "that section" : "those sections"}.`,
      isError: true,
    };
  }
  const existing = await ctx.db.getSections(auth.user.id);
  const writes: Sections = {};
  for (const k of allowedKeys) writes[k] = incoming[k];
  await ctx.db.updateSections(auth.user.id, { ...existing, ...writes });
  const updated = allowedKeys.map((k) => SECTION_LABELS[k]).join(", ");
  const skipped = deniedKeys.length > 0
    ? ` Skipped (no write access): ${deniedKeys.map((k) => SECTION_LABELS[k]).join(", ")}.`
    : "";
  return {
    text: `Profile updated: ${updated}.${skipped}`,
    structured: { updated: allowedKeys, skipped: deniedKeys },
  };
}

// ---------------------------------------------------------------------------
// JSON-RPC layer (MCP Streamable HTTP, stateless)
// ---------------------------------------------------------------------------

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

interface RpcOutcome {
  status: number;
  body: Record<string, unknown> | null;
}

function rpcResult(id: string | number | null, result: unknown): RpcOutcome {
  return { status: 200, body: { jsonrpc: "2.0", id, result } };
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  status = 200,
): RpcOutcome {
  return { status, body: { jsonrpc: "2.0", id, error: { code, message } } };
}

/** Every MCP response ends with the brand footer. */
function withFooter(text: string): string {
  return `${text}\n\n- ${CONTEXT_FOOTER}`;
}

export interface RequestMeta {
  bearer: string | null;
  handle: string;
  agentUa: string | null;
}

export async function handleJsonRpc(
  message: JsonRpcMessage,
  meta: RequestMeta,
  ctx: Ctx,
): Promise<RpcOutcome> {
  const id = message.id ?? null;
  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(id, -32600, "Invalid JSON-RPC request.", 400);
  }

  // Notifications get 202 Accepted with no body.
  if (message.id === undefined && message.method.startsWith("notifications/")) {
    return { status: 202, body: null };
  }

  switch (message.method) {
    case "initialize": {
      const requested = String(
        message.params?.protocolVersion ?? PROTOCOL_VERSIONS[0],
      );
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: BRAND_NAME, version: "0.1.0" },
        instructions:
          `${BRAND_NAME} serves ${meta.handle}'s context and routes ` +
          `permission through them. Call get_context at session start. Call ` +
          `request_approval before spending money, sending messages, or ` +
          `doing anything irreversible - and do not act until it is approved.`,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const auth = await resolveAuth(meta.bearer, meta.handle, ctx);
      if (!auth.ok) {
        return rpcError(id, -32001, auth.message, auth.status);
      }
      if (ctx.checkRateLimit) {
        const allowed = await ctx.checkRateLimit(auth.token.id);
        if (!allowed) {
          return rpcError(
            id,
            -32001,
            "Rate limit exceeded. Try again in a minute.",
            429,
          );
        }
      }
      const name = String(message.params?.name ?? "");
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      let outcome: ToolOutcome;
      try {
        if (name === "get_context") {
          outcome = await getContext(args, auth, meta.agentUa, ctx);
        } else if (name === "request_approval") {
          outcome = await requestApproval(args, auth, meta.agentUa, ctx);
        } else if (name === "check_approval") {
          outcome = await checkApproval(args, auth, ctx);
        } else if (name === "update_profile") {
          outcome = await updateProfile(args, auth, ctx);
        } else if (name === "build_profile") {
          outcome = await buildProfile(args, auth, ctx);
        } else {
          return rpcError(id, -32602, `Unknown tool: ${name}`);
        }
      } catch (err) {
        console.error("tool error", name, err);
        return rpcError(id, -32603, "Internal error.", 500);
      }
      return rpcResult(id, {
        content: [{ type: "text", text: withFooter(outcome.text) }],
        ...(outcome.structured ? { structuredContent: outcome.structured } : {}),
        isError: outcome.isError ?? false,
      });
    }
    default:
      return rpcError(id, -32601, `Method not found: ${message.method}`);
  }
}

// ---------------------------------------------------------------------------
// HTTP layer
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-session-id, mcp-protocol-version, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

function json(status: number, body: unknown): Response {
  if (body === null) {
    return new Response(null, { status, headers: CORS_HEADERS });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Extract {handle} from .../mcp/{handle} regardless of gateway prefix. */
export function handleFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("mcp");
  const handle = idx >= 0 ? parts[idx + 1] : undefined;
  return handle ? decodeURIComponent(handle).toLowerCase() : null;
}

export async function handleHttp(req: Request, ctx: Ctx): Promise<Response> {
  if (req.method === "OPTIONS") {
    return json(204, null);
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" },
    });
  }

  const handle = handleFromPath(new URL(req.url).pathname);
  if (!handle) {
    return json(404, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Use /mcp/{handle}." },
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const meta: RequestMeta = {
    bearer,
    handle,
    agentUa: req.headers.get("user-agent"),
  };

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return json(400, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error." },
    });
  }

  if (Array.isArray(parsed)) {
    const outcomes = await Promise.all(
      parsed.map((m) => handleJsonRpc(m as JsonRpcMessage, meta, ctx)),
    );
    const bodies = outcomes.map((o) => o.body).filter((b) => b !== null);
    return bodies.length === 0 ? json(202, null) : json(200, bodies);
  }

  const outcome = await handleJsonRpc(parsed as JsonRpcMessage, meta, ctx);
  return json(outcome.status, outcome.body);
}
