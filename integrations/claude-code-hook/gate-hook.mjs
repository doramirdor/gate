#!/usr/bin/env node
// Gate PreToolUse hook for Claude Code.
//
// Intercepts sensitive Bash commands and routes them through Gate's
// request_approval, blocking the tool call until a human approves, denies,
// or the request expires. "Confirm before acting" in a prompt is a
// suggestion; this hook is a wall.
//
// Node built-ins only - process.stdin + global fetch (Node 18+). No deps.
//
// Config (environment variables):
//   GATE_MCP_URL             full endpoint, e.g.
//                            https://<project-ref>.supabase.co/functions/v1/mcp/<handle>
//   GATE_TOKEN               bearer token that carries the "approvals" scope
//   GATE_SENSITIVE_PATTERNS  optional, comma-separated extra regexes to gate

const BRAND = "Gate"; // mirror of BRAND_NAME in @shared/brand - one place to change

// --- Sensitive command patterns: { label, re } -------------------------------
const DEFAULT_PATTERNS = [
  { label: "payment/charge/refund keyword", re: /\b(payment|charge|refund)\b/i },
  { label: "curl/wget POST or data upload", re: /\b(curl|wget)\b.*(-X\s*POST|--data(-raw|-binary|-urlencode)?\b|\s-d\b)/i },
  { label: "recursive force delete (rm -rf)", re: /\brm\s+-\w*r\w*f\w*\b|\brm\s+-\w*f\w*r\w*\b/i },
  { label: "force git push", re: /\bgit\s+push\b.*(--force(-with-lease)?\b|\s-f\b)/i },
  { label: "destructive SQL (DROP TABLE)", re: /\bDROP\s+TABLE\b/i },
  { label: "host shutdown", re: /\bshutdown\b/i },
];

// Extra regexes supplied via GATE_SENSITIVE_PATTERNS (comma-separated).
function extraPatterns() {
  const raw = process.env.GATE_SENSITIVE_PATTERNS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((src) => {
      try { return { label: "custom sensitive pattern", re: new RegExp(src, "i") }; }
      catch { return null; } // ignore a malformed user-supplied regex
    })
    .filter(Boolean);
}

// --- Hook decision output (current Claude Code PreToolUse protocol) -----------
function emit(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision, // "allow" | "deny"
      permissionDecisionReason: reason,
    },
  }));
}
function allow(reason) { emit("allow", reason); process.exit(0); }
function deny(reason) {
  emit("deny", reason);
  process.stderr.write(`${BRAND}: ${reason}\n`); // stderr mirror as a fallback signal
  process.exit(0);
}

// --- Gate MCP plumbing -------------------------------------------------------
async function callTool(name, args) {
  const url = process.env.GATE_MCP_URL;
  const token = process.env.GATE_TOKEN;
  if (!url || !token) throw new Error("GATE_MCP_URL / GATE_TOKEN are not set");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000); // hard cap per request
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "MCP error");
    return json.result?.structuredContent ?? {}; // { approval_id, status }
  } finally { clearTimeout(timer); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Main --------------------------------------------------------------------
async function main() {
  // 1. Read the PreToolUse payload from stdin.
  let payload = {};
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch { /* unreadable payload → treated as non-Bash below */ }

  // 2. Only Bash is gated; every other tool passes through untouched.
  if (payload.tool_name !== "Bash") process.exit(0);
  const command = String(payload.tool_input?.command ?? "");

  // 3. Match against the sensitive-pattern list. No match → allow silently.
  const hit = [...DEFAULT_PATTERNS, ...extraPatterns()].find((p) => p.re.test(command));
  if (!hit) process.exit(0);

  // 4. Sensitive: a human must approve. Misconfiguration fails safe (block).
  const reason = `matched ${hit.label}`;
  let result;
  try {
    result = await callTool("request_approval", {
      action_desc: `${command}  [${reason}]`,
      category: "shell",
    });
  } catch (e) {
    deny(`${BRAND} unreachable (${e.message}); blocking the sensitive command to fail safe.`);
  }

  // 5. Resolve now, or poll check_approval every 3s for up to ~15 minutes.
  let status = result.status;
  const id = result.approval_id;
  const deadline = Date.now() + 15 * 60 * 1000;
  while (status === "pending" && Date.now() < deadline) {
    await sleep(3000);
    try { status = (await callTool("check_approval", { approval_id: id })).status; }
    catch (e) { deny(`${BRAND} unreachable while awaiting approval (${e.message}); blocking.`); }
  }

  // 6. Final decision - anything that is not an explicit approval blocks.
  if (status === "approved") allow(`Approved by a human via ${BRAND} (${reason}).`);
  if (status === "pending") deny(`${BRAND} approval timed out after 15 min; blocking.`);
  deny(`${BRAND} ${status || "did not approve"}; blocking the sensitive command.`);
}

main();
