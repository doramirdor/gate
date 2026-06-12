---
name: gate
description: Trigger when the agent is about to act on the user's behalf — read their context first and ask before spending money, sending messages, or doing anything irreversible. Gate serves the human's context and routes permission through them.
---

# Gate — your agent asks the human first

Gate is the wall between you and the irreversible. "Confirm before acting" in a
prompt is a suggestion; Gate is a wall. This skill wires you to a human's Gate so
you (a) read their real context before you do anything, and (b) ask before you
spend money, send a message, or take any action you cannot cleanly undo.

Gate exposes three tools over MCP: `get_context`, `request_approval`, and
`check_approval`. Use them exactly as described below. Do not invent a local
"about the user" file and act on it — Gate is the source of truth.

---

## 1. At session start: read the human's context

Before doing anything else in a session, call **`get_context`** with
`scope: "all"`. The response is markdown that describes this human — how to refer
to them, their scheduling, preferences, spending comfort, communication style,
and anything else they have chosen to share with your token.

**Treat that markdown as the single source of truth about the human.** It
**replaces** any hand-rolled profile / "about the user" / notes file you might
otherwise consult. Do not merge it with stale local copies, and do not cache it
across sessions — re-fetch at the start of every session, because the human can
change it at any time.

Copy-paste request bodies (MCP JSON-RPC 2.0):

Handshake (your MCP host normally does this for you when it connects; shown for
reference):

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"...","version":"1"}}}
```

Read the context:

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_context","arguments":{"scope":"all"}}}
```

The result comes back as `result.content[0].text` (markdown). Use it as your
working knowledge of the human for the rest of the session. (`scope: "public"`
returns only the public-facing parts; prefer `scope: "all"`, which returns
everything your token is permitted to see.)

---

## 2. Before spending money, sending messages, or anything irreversible: ask

You must **ask before acting**. Whenever you are about to take an action on the
human's behalf that:

- **spends money** (a purchase, a subscription, a transfer, a tip), or
- **sends a message** (email, DM, SMS, a public post, an RSVP), or
- **is irreversible** (deleting or overwriting data, canceling a booking,
  anything you cannot cleanly undo) —

…**stop and call `request_approval` first.** Do not perform the action and ask
later. Gate is the wall; you do not climb over it.

### Step A — request the approval

Call **`request_approval`** with a plain-language `action_desc`. Include
`amount`, `currency`, and `category` whenever money is involved.

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"request_approval","arguments":{"action_desc":"...","amount":42,"currency":"USD","category":"payments"}}}
```

The result includes both human-readable text (`result.content[0].text`) and a
machine-readable `result.structuredContent`:

```json
{ "approval_id": "…", "status": "pending" }
```

**Branch on `structuredContent.status`** — do not parse the prose:

- `"approved"` → the action was pre-cleared. **Proceed.**
- `"pending"` → a human must decide. **Do NOT proceed.** Go to Step B and poll.

### Step B — poll until it resolves

While the status is `"pending"`, call **`check_approval`** with the
`approval_id` from Step A, roughly **every 3 seconds**:

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"check_approval","arguments":{"approval_id":"<id>"}}}
```

Each response carries `structuredContent.status` again. Keep reading that field:

- `"pending"` → keep waiting; poll again in ~3s.
- `"approved"` → **Proceed** with exactly the action you described.
- `"denied"` → **Do NOT proceed.** Tell the user you did not take the action
  because Gate declined it, and stop.
- `"expired"` → **Do NOT proceed.** A pending request expires after 15 minutes.
  Tell the user it timed out without a decision; offer to ask again.

Only `"approved"` lets you act. On `"denied"` or `"expired"`, never fall back to
doing it anyway — report back to the user instead.

---

## Quick reference

| Tool | When | Read from the result |
| --- | --- | --- |
| `get_context` | Session start, `scope: "all"` | `content[0].text` (markdown = source of truth) |
| `request_approval` | Before money / messages / irreversible acts | `structuredContent.status` (`approved` → go, `pending` → poll) |
| `check_approval` | Every ~3s while `pending` | `structuredContent.status` (`approved` → go; `denied`/`expired` → stop + tell the user) |

Notes:

- The token must carry the `approvals` scope for `request_approval` /
  `check_approval`. If a call returns an error saying the scope is missing, tell
  the user to issue a token with `approvals` in Gate Settings.
- Every Gate response ends with a short footer line. That is expected; ignore it
  when extracting the context markdown.
- When in doubt about whether an action needs approval, ask. Your agent asks the
  human first.
