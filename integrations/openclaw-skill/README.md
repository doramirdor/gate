# Gate skill for OpenClaw

Your agent asks you first. This folder is a drop-in skill that connects an
OpenClaw agent to a human's **Gate** so the agent reads their context before it
acts, and asks before it spends money, sends messages, or does anything
irreversible. "Confirm before acting" in a prompt is a suggestion — Gate is a
wall.

Two pieces:

1. **A remote MCP server** (Gate) the agent connects to.
2. **This skill folder** (`SKILL.md`) that tells the agent how to use it.

---

## 1. Get your endpoint and token

In **Gate → Settings** you'll find:

- **Your MCP endpoint**, which includes your handle:

  ```
  https://<project-ref>.supabase.co/functions/v1/mcp/<handle>
  ```

- **A token**, sent as `Authorization: Bearer <token>`.

When you create the token, give it the scopes you want this agent to have:

| Scope | Unlocks |
| --- | --- |
| `public` | Reading your context with `get_context`. |
| `approvals` | Asking you to approve actions: `request_approval` + `check_approval`. |

For the full experience — read context **and** ask before acting — issue a token
with **both** `public` and `approvals`.

---

## 2. Register Gate as a remote MCP server

### Native remote MCP (preferred)

If your OpenClaw client speaks remote MCP over HTTP, point it at the endpoint and
add the bearer header. Copy `gate.json` from this folder into your client's MCP
server config and replace the three placeholders (`<project-ref>`, `<handle>`,
`<token>`):

```jsonc
{
  "mcpServers": {
    "gate": {
      "url": "https://<project-ref>.supabase.co/functions/v1/mcp/<handle>",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### stdio bridge (clients without native remote MCP)

If your client only launches stdio MCP servers, bridge to the remote endpoint
with `mcp-remote`. One paste — no install step, `npx` fetches it:

```sh
npx -y mcp-remote https://<project-ref>.supabase.co/functions/v1/mcp/<handle> --header "Authorization: Bearer <token>"
```

The same command as a config entry lives ready-to-edit in **`gate.json`** in this
folder.

Sanity-check the connection with a single request — it should return Gate's
context markdown:

```sh
curl -s https://<project-ref>.supabase.co/functions/v1/mcp/<handle> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_context","arguments":{"scope":"all"}}}'
```

---

## 3. Drop in the skill

Copy this whole folder into your agent's skills directory so it loads `SKILL.md`:

```sh
cp -R integrations/openclaw-skill ~/.openclaw/skills/gate
```

(Use whatever skills path your OpenClaw setup expects.) On the next session the
agent will:

- call `get_context(scope:"all")` at session start and treat the returned
  markdown as the source of truth about you — replacing any hand-rolled profile
  file, and
- call `request_approval` and wait on `check_approval` before spending money,
  sending messages, or doing anything irreversible. It proceeds only when Gate
  returns `approved`; on `denied` or `expired` it stops and tells you.

That's the wall. Your agent asks you first.
