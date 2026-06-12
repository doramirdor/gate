#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Gate end-to-end smoke test.
 *
 * Seeds a throwaway user with the service role, then drives the LIVE MCP
 * endpoint over HTTP through the full approval lifecycle - scope enforcement,
 * the signature footer, auto-approve, the pending "wall", a human approval,
 * the trust-ladder always-allow, and token revocation - then deletes the user
 * (the auth.users -> public.users cascade wipes every seeded row).
 *
 * Prereqs: a running local stack -
 *   supabase start
 *   supabase db push
 *   supabase functions serve --no-verify-jwt
 *
 * Run:
 *   ~/.deno/bin/deno run -A scripts/smoke-e2e.ts        (deno not on PATH? use the full path)
 *   npm run test:e2e                                    (if the supabase/deno CLIs are on PATH)
 *
 * Config via env (falls back to local-stack defaults / .env.local):
 *   SUPABASE_URL                default http://127.0.0.1:54321
 *   SUPABASE_SERVICE_ROLE_KEY   required (from `supabase status` or .env.local)
 */
import { createClient } from "npm:@supabase/supabase-js@2";

// --- load .env.local if present so a plain `deno run` works after onboarding ---
async function loadEnvLocal() {
  try {
    const text = await Deno.readTextFile(new URL("../.env.local", import.meta.url));
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!Deno.env.get(m[1])) Deno.env.set(m[1], val);
    }
  } catch { /* no .env.local - rely on real env */ }
}
await loadEnvLocal();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ??
  Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "http://127.0.0.1:54321";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!SERVICE_KEY) {
  console.error("✗ SUPABASE_SERVICE_ROLE_KEY is required (from `supabase status` or .env.local).");
  Deno.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// --- assertion harness ---
let passed = 0, failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { console.log(`  ✓ ${name}`); passed++; }
  else { console.error(`  ✗ ${name}${detail ? ` - ${detail}` : ""}`); failed++; }
}

// --- MCP JSON-RPC helper ---
const handle = `smoke-${crypto.randomUUID().slice(0, 8)}`;
const endpoint = `${SUPABASE_URL}/functions/v1/mcp/${handle}`;

// deno-lint-ignore no-explicit-any
async function call(token: string, method: string, params?: Record<string, any>) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
// deno-lint-ignore no-explicit-any
const tool = (token: string, name: string, args: Record<string, any>) =>
  call(token, "tools/call", { name, arguments: args });
// deno-lint-ignore no-explicit-any
const structured = (json: any) => json?.result?.structuredContent ?? {};
// deno-lint-ignore no-explicit-any
const textOf = (json: any) => json?.result?.content?.[0]?.text ?? "";

let userId = "";
try {
  // --- seed a throwaway user ---
  console.log(`\nSeeding throwaway user @${handle} at ${SUPABASE_URL} ...`);
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: `${handle}@smoke.test`,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (cErr || !created.user) throw new Error(`createUser failed: ${cErr?.message}`);
  userId = created.user.id;

  const { error: uErr } = await admin.from("users").insert({ id: userId, handle });
  if (uErr) throw new Error(`users insert failed: ${uErr.message}`);
  await admin.from("profiles").insert({
    user_id: userId,
    sections: {
      identity: { content: "Smoke-test human. Lives in CI.", visibility: "public" },
      budget: { content: "Comfortable up to $200 per order.", visibility: "private" },
    },
  });
  const { data: fullTok, error: tErr } = await admin.from("tokens")
    .insert({ user_id: userId, scopes: ["public", "approvals", "budget"], label: "smoke-full" })
    .select("id").single();
  if (tErr || !fullTok) throw new Error(`token insert failed: ${tErr?.message}`);
  const { data: pubTok } = await admin.from("tokens")
    .insert({ user_id: userId, scopes: ["public"], label: "smoke-public" })
    .select("id").single();
  const FULL = fullTok.id as string;
  const PUB = pubTok!.id as string;
  // auto-approve dial: anything under $100 USD clears without asking.
  await admin.from("rules").insert({
    user_id: userId,
    rule: { type: "spend_threshold", amount: 100, currency: "USD", action: "ask" },
  });

  // --- reachability ---
  console.log("\nMCP endpoint:");
  const list = await call(FULL, "tools/list");
  check("tools/list returns the three tools", (list.json?.result?.tools?.length ?? 0) === 3,
    `got ${list.json?.result?.tools?.length ?? "none"} (is \`functions serve\` running?)`);

  // --- get_context: scope enforcement + footer ---
  console.log("\nget_context:");
  const ctxFull = textOf((await tool(FULL, "get_context", { scope: "all" })).json);
  check("full token sees the private Budget section", ctxFull.includes("Comfortable up to $200"));
  check("response carries the Gate footer", /context served by/i.test(ctxFull));
  const ctxPub = textOf((await tool(PUB, "get_context", { scope: "all" })).json);
  check("public-only token is denied the private Budget section", !ctxPub.includes("Comfortable up to $200"));

  // --- request_approval ---
  console.log("\nrequest_approval:");
  const noScope = await tool(PUB, "request_approval", { action_desc: "anything" });
  check("public token is blocked from approvals", noScope.json?.result?.isError === true);

  const under = structured((await tool(FULL, "request_approval",
    { action_desc: "Coffee", amount: 50, currency: "USD", category: "food" })).json);
  check("under the spend threshold auto-approves", under.status === "approved", JSON.stringify(under));

  const over = structured((await tool(FULL, "request_approval",
    { action_desc: "Buy a $250 gift", amount: 250, currency: "USD", category: "gifts" })).json);
  check("over the spend threshold goes pending", over.status === "pending", JSON.stringify(over));
  const apprId = over.approval_id as string;

  // --- check_approval, then simulate the human tapping Approve in /inbox ---
  console.log("\ncheck_approval:");
  const poll1 = structured((await tool(FULL, "check_approval", { approval_id: apprId })).json);
  check("pending approval reads back pending", poll1.status === "pending");
  await admin.from("approvals")
    .update({ status: "approved", resolved_ts: new Date().toISOString() }).eq("id", apprId);
  const poll2 = structured((await tool(FULL, "check_approval", { approval_id: apprId })).json);
  check("after the human approves, check_approval reads approved", poll2.status === "approved");

  // --- the wall: an unrulled irreversible action is HELD, not approved ---
  console.log("\nthe wall:");
  const rogue = structured((await tool(FULL, "request_approval",
    { action_desc: "Delete all 3,812 emails in inbox" })).json);
  check("unrulled irreversible action is held (pending), never auto-approved", rogue.status === "pending");

  // --- trust ladder: always-allow a category ---
  console.log("\ntrust ladder (always_allow):");
  const g1 = structured((await tool(FULL, "request_approval",
    { action_desc: "Order milk", category: "groceries" })).json);
  check("first groceries request is pending", g1.status === "pending");
  await admin.from("rules").insert({
    user_id: userId, rule: { type: "always_allow", match: { category: "groceries" } },
  });
  const g2 = structured((await tool(FULL, "request_approval",
    { action_desc: "Order eggs", category: "groceries" })).json);
  check("after always-allow, the next groceries request auto-approves", g2.status === "approved");

  // --- revocation ---
  console.log("\nrevocation:");
  await admin.from("tokens").update({ revoked_at: new Date().toISOString() }).eq("id", PUB);
  const revoked = await tool(PUB, "get_context", { scope: "all" });
  check("a revoked token is rejected with 401", revoked.status === 401, `status ${revoked.status}`);
} catch (e) {
  console.error("\n✗ smoke test threw:", e instanceof Error ? e.message : e);
  failed++;
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    console.log("\nCleaned up the throwaway user.");
  }
}

console.log(`\n${failed === 0 ? "✓ ALL PASS" : "✗ FAILURES"} - ${passed} passed, ${failed} failed.`);
Deno.exit(failed === 0 ? 0 : 1);
