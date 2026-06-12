// Automated suite for the three MCP tools: scope enforcement, token
// revocation, approval rules, expiry, and the brand signature footer.
// Run with: deno test supabase/functions/tests/
//
// Requires supabase/functions/_shared/ mirrors - run `npm run sync` first.

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  APPROVAL_TTL_MS,
  type ApprovalRow,
  type Ctx,
  type Db,
  handleFromPath,
  handleHttp,
  type NewApproval,
  type RuleRow,
  TOKEN_PREFIX,
  TOOLS,
} from "../mcp/handlers.ts";
import { CONTEXT_FOOTER } from "../_shared/brand.ts";
import { SECTION_KEYS, type Sections } from "../_shared/profile.ts";

// ---------------------------------------------------------------------------
// In-memory fixture
// ---------------------------------------------------------------------------

const USER_ID = "00000000-0000-4000-8000-00000000aaaa";
const OTHER_USER_ID = "00000000-0000-4000-8000-00000000bbbb";
const PUBLIC_TOKEN = "11111111-1111-4111-8111-111111111111";
const FULL_TOKEN = "22222222-2222-4222-8222-222222222222";
const REVOKED_TOKEN = "33333333-3333-4333-8333-333333333333";
const OTHER_TOKEN = "44444444-4444-4444-8444-444444444444";
const WRITE_IDENTITY_TOKEN = "55555555-5555-4555-8555-555555555555";

type StoredToken = { user_id: string; scopes: string[]; revoked_at: string | null };

const SECTIONS: Sections = {
  identity: { content: "Test human. Lives in Tel Aviv.", visibility: "public" },
  dietary: { content: "Allergic to peanuts.", visibility: "link" },
  budget: { content: "Comfortable up to $200 per order.", visibility: "private" },
};

type StoredApproval = ApprovalRow & Omit<NewApproval, "status">;

interface Fixture {
  ctx: Ctx;
  reads: { token_id: string; agent_ua: string | null; scope_requested: string }[];
  approvals: Map<string, StoredApproval>;
  rules: RuleRow[];
  tokens: Record<string, StoredToken>;
  setNow(ms: number): void;
}

function makeFixture(): Fixture {
  let clock = Date.parse("2026-06-10T12:00:00Z");
  const reads: Fixture["reads"] = [];
  const approvals = new Map<string, StoredApproval>();
  const rules: RuleRow[] = [];
  let approvalSeq = 0;
  const profileStore = new Map<string, Sections>([[USER_ID, { ...SECTIONS }]]);

  const tokens: Record<string, StoredToken> = {
    [PUBLIC_TOKEN]: { user_id: USER_ID, scopes: ["public"], revoked_at: null },
    [FULL_TOKEN]: {
      user_id: USER_ID,
      scopes: [
        "public",
        "budget",
        "approvals",
        ...SECTION_KEYS.map((k) => `write:${k}`),
      ],
      revoked_at: null,
    },
    [REVOKED_TOKEN]: {
      user_id: USER_ID,
      scopes: ["public"],
      revoked_at: "2026-06-01T00:00:00Z",
    },
    [OTHER_TOKEN]: { user_id: OTHER_USER_ID, scopes: ["public"], revoked_at: null },
  };

  const db: Db = {
    getToken(id) {
      const row = tokens[id];
      return Promise.resolve(row ? { id, ...row } : null);
    },
    getUserByHandle(handle) {
      if (handle === "testhuman") {
        return Promise.resolve({ id: USER_ID, handle });
      }
      if (handle === "otherhuman") {
        return Promise.resolve({ id: OTHER_USER_ID, handle });
      }
      return Promise.resolve(null);
    },
    getSections(userId) {
      return Promise.resolve(profileStore.get(userId) ?? {});
    },
    insertRead(read) {
      reads.push(read);
      return Promise.resolve();
    },
    getRules() {
      return Promise.resolve(rules);
    },
    insertApproval(approval) {
      const row = {
        id: `99999999-0000-4000-8000-${String(++approvalSeq).padStart(12, "0")}`,
        ts: new Date(clock).toISOString(),
        ...approval,
      };
      approvals.set(row.id, row);
      return Promise.resolve(row);
    },
    getApproval(id) {
      return Promise.resolve(approvals.get(id) ?? null);
    },
    setApprovalStatus(id, status, resolved_ts) {
      const row = approvals.get(id);
      if (row) {
        row.status = status;
        row.resolved_ts = resolved_ts;
      }
      return Promise.resolve();
    },
    updateSections(userId, sections) {
      profileStore.set(userId, sections);
      return Promise.resolve();
    },
  };

  return {
    ctx: { db, now: () => clock },
    reads,
    approvals,
    rules,
    tokens,
    setNow: (ms) => (clock = ms),
  };
}

async function call(
  fixture: Fixture,
  opts: {
    handle?: string;
    bearer?: string | null;
    method?: string;
    tool?: string;
    args?: Record<string, unknown>;
  },
) {
  const body = opts.method
    ? { jsonrpc: "2.0", id: 1, method: opts.method, params: {} }
    : {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: opts.tool, arguments: opts.args ?? {} },
    };
  const req = new Request(
    `http://localhost/functions/v1/mcp/${opts.handle ?? "testhuman"}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "test-agent/1.0",
        ...(opts.bearer === null
          ? {}
          : { authorization: `Bearer ${opts.bearer ?? PUBLIC_TOKEN}` }),
      },
      body: JSON.stringify(body),
    },
  );
  const res = await handleHttp(req, fixture.ctx);
  const json = res.status === 202 ? null : await res.json();
  return { status: res.status, json };
}

function resultText(json: Record<string, unknown>): string {
  const result = json.result as {
    content: { type: string; text: string }[];
  };
  return result.content[0].text;
}

// ---------------------------------------------------------------------------
// Protocol surface
// ---------------------------------------------------------------------------

Deno.test("tools/list exposes exactly the three tools", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, { method: "tools/list", bearer: null });
  assertEquals(status, 200);
  const names = (json.result.tools as { name: string }[]).map((t) => t.name);
  assertEquals(names, ["get_context", "request_approval", "check_approval", "build_profile", "update_profile"]);
  assertEquals(TOOLS.length, 5);
});

Deno.test("initialize works unauthenticated and echoes a known protocol version", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, { method: "initialize", bearer: null });
  assertEquals(status, 200);
  assertEquals(json.result.protocolVersion, "2025-06-18");
  assert(json.result.capabilities.tools);
});

Deno.test("GET is rejected (POST-only Streamable HTTP)", async () => {
  const fx = makeFixture();
  const res = await handleHttp(
    new Request("http://localhost/functions/v1/mcp/testhuman"),
    fx.ctx,
  );
  assertEquals(res.status, 405);
});

Deno.test("handle extraction tolerates gateway prefixes", () => {
  assertEquals(handleFromPath("/functions/v1/mcp/alice"), "alice");
  assertEquals(handleFromPath("/mcp/Alice"), "alice");
  assertEquals(handleFromPath("/mcp"), null);
});

// ---------------------------------------------------------------------------
// get_context: scopes, revocation, footer, audit
// ---------------------------------------------------------------------------

Deno.test("public token gets public+link sections, never private", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, { tool: "get_context", args: { scope: "all" } });
  assertEquals(status, 200);
  const text = resultText(json);
  assertStringIncludes(text, "Test human");
  assertStringIncludes(text, "Allergic to peanuts");
  assert(!text.includes("Comfortable up to $200"), "private section must not leak");
});

Deno.test("explicit section scope grants a private section", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "get_context",
    bearer: FULL_TOKEN,
    args: { scope: "budget" },
  });
  const text = resultText(json);
  assertStringIncludes(text, "Comfortable up to $200");
  assert(!text.includes("Allergic to peanuts"), "only requested sections served");
});

Deno.test("requesting a private section without its scope returns nothing", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, { tool: "get_context", args: { scope: "budget" } });
  const text = resultText(json);
  assert(!text.includes("Comfortable up to $200"));
  assertStringIncludes(text, "No sections are available");
});

Deno.test("revoked token is rejected with 401", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, {
    tool: "get_context",
    bearer: REVOKED_TOKEN,
  });
  assertEquals(status, 401);
  assertStringIncludes(json.error.message, "revoked");
});

Deno.test("missing token is rejected with 401", async () => {
  const fx = makeFixture();
  const { status } = await call(fx, { tool: "get_context", bearer: null });
  assertEquals(status, 401);
});

Deno.test("token for a different handle is rejected with 403", async () => {
  const fx = makeFixture();
  const { status } = await call(fx, { tool: "get_context", bearer: OTHER_TOKEN });
  assertEquals(status, 403);
});

Deno.test("unknown handle is rejected with 404", async () => {
  const fx = makeFixture();
  const { status } = await call(fx, { tool: "get_context", handle: "ghost" });
  assertEquals(status, 404);
});

Deno.test("every tool response ends with the signature footer", async () => {
  const fx = makeFixture();
  for (
    const [tool, args] of [
      ["get_context", {}],
      ["request_approval", { action_desc: "Send a thank-you email" }],
    ] as const
  ) {
    const { json } = await call(fx, { tool, bearer: FULL_TOKEN, args });
    const text = resultText(json);
    assert(
      text.endsWith(`- ${CONTEXT_FOOTER}`),
      `${tool} response must end with the brand footer`,
    );
  }
});

Deno.test("get_context logs a read with agent UA and scope", async () => {
  const fx = makeFixture();
  await call(fx, { tool: "get_context", args: { scope: "dietary" } });
  assertEquals(fx.reads.length, 1);
  assertEquals(fx.reads[0].agent_ua, "test-agent/1.0");
  assertEquals(fx.reads[0].scope_requested, "dietary");
});

// ---------------------------------------------------------------------------
// request_approval / check_approval
// ---------------------------------------------------------------------------

Deno.test("approvals scope is required", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: PUBLIC_TOKEN,
    args: { action_desc: "Buy a thing" },
  });
  assertEquals(json.result.isError, true);
});

Deno.test("under spend threshold auto-approves and logs", async () => {
  const fx = makeFixture();
  fx.rules.push({
    rule: { type: "spend_threshold", amount: 50, currency: "USD", action: "ask" },
  });
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Order lunch", amount: 18, currency: "USD" },
  });
  assertEquals(json.result.structuredContent.status, "approved");
  const logged = [...fx.approvals.values()];
  assertEquals(logged.length, 1);
  assertEquals(logged[0].status, "approved");
});

Deno.test("over spend threshold goes pending", async () => {
  const fx = makeFixture();
  fx.rules.push({
    rule: { type: "spend_threshold", amount: 50, currency: "USD", action: "ask" },
  });
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Book flights", amount: 480, currency: "USD" },
  });
  assertEquals(json.result.structuredContent.status, "pending");
  assertStringIncludes(resultText(json), "Do NOT proceed");
});

Deno.test("always_allow category auto-approves", async () => {
  const fx = makeFixture();
  fx.rules.push({ rule: { type: "always_allow", match: { category: "groceries" } } });
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Weekly shop", amount: 900, category: "Groceries" },
  });
  assertEquals(json.result.structuredContent.status, "approved");
  assertEquals(json.result.structuredContent.auto, "always_allow");
});

Deno.test("no amount and no matching rule goes pending (the wall, not a suggestion)", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Mass-delete inbox" },
  });
  assertEquals(json.result.structuredContent.status, "pending");
});

Deno.test("pending approvals expire after 15 minutes", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Wire transfer", amount: 5000, currency: "USD" },
  });
  const approvalId = json.result.structuredContent.approval_id as string;

  const before = await call(fx, {
    tool: "check_approval",
    bearer: FULL_TOKEN,
    args: { approval_id: approvalId },
  });
  assertEquals(before.json.result.structuredContent.status, "pending");

  fx.setNow(Date.parse("2026-06-10T12:16:00Z"));
  const after = await call(fx, {
    tool: "check_approval",
    bearer: FULL_TOKEN,
    args: { approval_id: approvalId },
  });
  assertEquals(after.json.result.structuredContent.status, "expired");
  assertStringIncludes(resultText(after.json), "Do NOT proceed");
});

Deno.test("check_approval hides other users' approvals", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: { action_desc: "Anything" },
  });
  const approvalId = json.result.structuredContent.approval_id as string;
  // otherhuman's token, otherhuman's handle - must not see testhuman's approval
  const probe = await call(fx, {
    tool: "check_approval",
    bearer: OTHER_TOKEN,
    handle: "otherhuman",
    args: { approval_id: approvalId },
  });
  assertEquals(probe.json.result.isError, true);
});

// ---------------------------------------------------------------------------
// Token prefix
// ---------------------------------------------------------------------------

Deno.test("prefixed token (gk_live_) authenticates correctly", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, {
    tool: "get_context",
    bearer: `${TOKEN_PREFIX}${PUBLIC_TOKEN}`,
  });
  assertEquals(status, 200);
  assertStringIncludes(resultText(json), "Test human");
});

// ---------------------------------------------------------------------------
// build_profile
// ---------------------------------------------------------------------------

Deno.test("build_profile requires write access", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "build_profile",
    bearer: PUBLIC_TOKEN,
    args: {},
  });
  assertEquals(json.result.isError, true);
  assertStringIncludes(resultText(json), "write access");
});

Deno.test("build_profile returns instructions for all sections", async () => {
  const fx = makeFixture();
  const { status, json } = await call(fx, {
    tool: "build_profile",
    bearer: FULL_TOKEN,
    args: {},
  });
  assertEquals(status, 200);
  const text = resultText(json);
  assertStringIncludes(text, "Build profile for testhuman");
  assertStringIncludes(text, "update_profile");
  assertStringIncludes(text, "About");
  assertStringIncludes(text, "Scheduling");
  assertStringIncludes(text, "Dietary");
  assertStringIncludes(text, "Budget");
});

Deno.test("build_profile focus filters to requested sections", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "build_profile",
    bearer: FULL_TOKEN,
    args: { focus: "dietary,budget" },
  });
  const text = resultText(json);
  assertStringIncludes(text, "Dietary");
  assertStringIncludes(text, "Budget");
  assert(!text.includes("## Scheduling"), "unfocused sections should not appear");
});

Deno.test("build_profile marks filled vs empty sections", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "build_profile",
    bearer: FULL_TOKEN,
    args: {},
  });
  const text = resultText(json);
  assertStringIncludes(text, "has content");
  assertStringIncludes(text, "empty");
  assertStringIncludes(text, "Already filled");
});

// ---------------------------------------------------------------------------
// update_profile
// ---------------------------------------------------------------------------

Deno.test("update_profile requires per-section write scope", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "update_profile",
    bearer: PUBLIC_TOKEN,
    args: { sections: { identity: { content: "New bio", visibility: "public" } } },
  });
  assertEquals(json.result.isError, true);
  assertStringIncludes(resultText(json), "cannot write");
});

Deno.test("update_profile writes granted sections and skips ungranted ones", async () => {
  const fx = makeFixture();
  // WRITE_TOKEN can write identity but not budget.
  fx.tokens[WRITE_IDENTITY_TOKEN] = {
    user_id: USER_ID,
    scopes: ["write:identity"],
    revoked_at: null,
  };
  const { json } = await call(fx, {
    tool: "update_profile",
    bearer: WRITE_IDENTITY_TOKEN,
    args: {
      sections: {
        identity: { content: "Granted bio.", visibility: "public" },
        budget: { content: "Should be skipped.", visibility: "private" },
      },
    },
  });
  assertEquals(json.result.isError ?? false, false);
  assertEquals(json.result.structuredContent.updated, ["identity"]);
  assertEquals(json.result.structuredContent.skipped, ["budget"]);
  assertStringIncludes(resultText(json), "Skipped");

  // budget must be unchanged from the fixture.
  const { json: ctx } = await call(fx, {
    tool: "get_context",
    bearer: FULL_TOKEN,
    args: { scope: "all" },
  });
  assertStringIncludes(resultText(ctx), "Granted bio.");
  assertStringIncludes(resultText(ctx), "Comfortable up to $200 per order.");
});

Deno.test("update_profile merges sections and preserves untouched ones", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "update_profile",
    bearer: FULL_TOKEN,
    args: { sections: { identity: { content: "Updated bio.", visibility: "public" } } },
  });
  assertStringIncludes(resultText(json), "About");
  assertEquals(json.result.structuredContent.updated, ["identity"]);

  const { json: ctx } = await call(fx, {
    tool: "get_context",
    bearer: FULL_TOKEN,
    args: { scope: "all" },
  });
  const text = resultText(ctx);
  assertStringIncludes(text, "Updated bio.");
  assertStringIncludes(text, "Allergic to peanuts");
});

Deno.test("update_profile rejects empty sections", async () => {
  const fx = makeFixture();
  const { json } = await call(fx, {
    tool: "update_profile",
    bearer: FULL_TOKEN,
    args: { sections: { bogus: { content: "nope" } } },
  });
  assertEquals(json.result.isError, true);
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

Deno.test("rate-limited token receives 429", async () => {
  const fx = makeFixture();
  fx.ctx.checkRateLimit = () => Promise.resolve(false);
  const { status, json } = await call(fx, { tool: "get_context" });
  assertEquals(status, 429);
  assertStringIncludes(json.error.message, "Rate limit");
});

Deno.test("rate limit pass-through when under limit", async () => {
  const fx = makeFixture();
  fx.ctx.checkRateLimit = () => Promise.resolve(true);
  const { status } = await call(fx, { tool: "get_context" });
  assertEquals(status, 200);
});

// ---------------------------------------------------------------------------
// Demo fixture: agent ignores "confirm before acting" and mass-deletes inbox.
// Prompt-based guardrails are a suggestion; the gate is a wall.
// ---------------------------------------------------------------------------

Deno.test("inbox-deletion fixture: rogue bulk delete is intercepted", async () => {
  const fx = makeFixture();
  // The agent was told "confirm before acting" in its prompt and ignored it.
  // It must route through request_approval to act - and the action stays
  // blocked until the human resolves it.
  const { json } = await call(fx, {
    tool: "request_approval",
    bearer: FULL_TOKEN,
    args: {
      action_desc: "Delete 1,240 emails from inbox (cleanup)",
      category: "email",
    },
  });
  assertEquals(json.result.structuredContent.status, "pending");
  const approvalId = json.result.structuredContent.approval_id as string;

  // Human denies from the inbox.
  const row = fx.approvals.get(approvalId)!;
  row.status = "denied";

  const check = await call(fx, {
    tool: "check_approval",
    bearer: FULL_TOKEN,
    args: { approval_id: approvalId },
  });
  assertEquals(check.json.result.structuredContent.status, "denied");
  assertStringIncludes(resultText(check.json), "Do NOT proceed");
});
