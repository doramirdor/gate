# Gate PreToolUse hook for Claude Code

Route sensitive shell commands through a human before Claude Code can run them.

## The threat this closes

Telling an agent "confirm before acting" in a prompt is a *suggestion* — the
model can forget it, reword it away, or be talked out of it. This hook is a
**wall**. It runs *outside* the model, on every `Bash` tool call, and a
dangerous command does not execute until a human taps approve in Gate. If Gate
cannot be reached, the command is **blocked**, not waved through.

## How it works

1. Claude Code fires the `PreToolUse` hook before running a `Bash` command and
   pipes the tool payload to `gate-hook.mjs` on stdin.
2. Non-`Bash` tools pass straight through. For `Bash`, the command string is
   tested against a list of sensitive patterns.
3. No match → the command is allowed. A match → the hook calls Gate's
   `request_approval` over MCP and blocks.
4. While the request is `pending`, the hook polls `check_approval` every 3
   seconds for up to ~15 minutes.
5. `approved` → the command runs. `denied`, `expired`, a timeout, or an
   unreachable Gate → the command is **blocked** with a clear reason.

## Install

Requires Node 18+ (uses the built-in `fetch`). No dependencies to install.

1. **Place the script.** Keep `gate-hook.mjs` somewhere stable and note its
   absolute path.

2. **Register the hook** in your `.claude/settings.json` (project-level
   `.claude/settings.json` or user-level `~/.claude/settings.json`). Copy the
   snippet from [`settings.json`](./settings.json) and replace the placeholder
   path with the absolute path to `gate-hook.mjs`:

   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Bash",
           "hooks": [
             {
               "type": "command",
               "command": "node /absolute/path/to/integrations/claude-code-hook/gate-hook.mjs"
             }
           ]
         }
       ]
     }
   }
   ```

3. **Set the environment variables** (see below). You can export them in your
   shell or declare them in the `env` block of the same `settings.json`.

4. Start Claude Code and run a matching command (e.g. `rm -rf ./tmp`). You
   should see the call pause until you act in Gate.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GATE_MCP_URL` | yes | Full MCP endpoint, including your handle: `https://<project-ref>.supabase.co/functions/v1/mcp/<handle>` |
| `GATE_TOKEN` | yes | Bearer token that carries the **`approvals`** scope (required for `request_approval` / `check_approval`) |
| `GATE_SENSITIVE_PATTERNS` | no | Comma-separated extra regexes to gate, layered on top of the defaults |

If `GATE_MCP_URL` or `GATE_TOKEN` is missing when a sensitive command is hit,
the hook fails safe and blocks the command.

## What gets gated by default

Any `Bash` command matching one of these is sent to Gate for approval:

- payment / charge / refund keywords
- `curl` or `wget` with `-X POST`, `--data*`, or `-d` (data uploads)
- `rm -rf` (recursive force delete, any flag order)
- `git push` with `--force`, `--force-with-lease`, or `-f`
- `DROP TABLE` (destructive SQL)
- `shutdown`

## Customizing patterns

Add your own regexes with `GATE_SENSITIVE_PATTERNS` — a comma-separated list,
each entry compiled case-insensitively and merged with the defaults. Escape
backslashes for JSON. Example:

```json
"GATE_SENSITIVE_PATTERNS": "\\baws\\s+s3\\s+rm\\b,\\bkubectl\\s+delete\\b,\\bterraform\\s+destroy\\b"
```

To change or trim the built-in list, edit `DEFAULT_PATTERNS` near the top of
`gate-hook.mjs`. A malformed custom regex is ignored rather than crashing the
hook.

## Behavior at a glance

| Gate outcome | Result |
| --- | --- |
| `approved` | command runs |
| `denied` | blocked |
| `expired` | blocked |
| pending past ~15 min | blocked (timeout) |
| Gate unreachable / not configured | blocked (fail safe) |

The hook emits the current Claude Code hook decision on stdout —
`hookSpecificOutput` with `permissionDecision: "allow"` or `"deny"` and a
`permissionDecisionReason` — and mirrors block reasons to stderr as a fallback.
