#!/usr/bin/env bash
set -euo pipefail

# Gate hook installer for Claude Code
# Usage: curl -sL https://usegate.dev/setup.sh | bash

HOOK_DIR="${HOME}/.gate"
HOOK_FILE="${HOOK_DIR}/gate-hook.mjs"
SETTINGS_FILE="${HOME}/.claude/settings.json"
HOOK_URL="https://raw.githubusercontent.com/AskGate/gate/main/integrations/claude-code-hook/gate-hook.mjs"

echo ""
echo "  Gate - hook installer for Claude Code"
echo "  ──────────────────────────────────────"
echo ""

# Prompt for endpoint and token
read -rp "  MCP endpoint URL: " GATE_MCP_URL
read -rp "  Bearer token:     " GATE_TOKEN

if [ -z "$GATE_MCP_URL" ] || [ -z "$GATE_TOKEN" ]; then
  echo ""
  echo "  Both the endpoint and token are required."
  echo "  Find them at https://usegate.dev → Settings → Tokens."
  exit 1
fi

# Download the hook
mkdir -p "$HOOK_DIR"
echo ""
echo "  Downloading hook → ${HOOK_FILE}"
curl -sL "$HOOK_URL" -o "$HOOK_FILE"

# Build the settings merge
mkdir -p "${HOME}/.claude"

if [ -f "$SETTINGS_FILE" ]; then
  # Check if node is available for JSON merge
  if command -v node &>/dev/null; then
    node -e "
      const fs = require('fs');
      const existing = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
      if (!existing.hooks) existing.hooks = {};
      if (!existing.hooks.PreToolUse) existing.hooks.PreToolUse = [];
      const hookCmd = 'node ${HOOK_FILE}';
      const already = existing.hooks.PreToolUse.some(h =>
        h.matcher === 'Bash' && h.hooks?.some(hh => hh.command?.includes('gate-hook'))
      );
      if (!already) {
        existing.hooks.PreToolUse.push({
          matcher: 'Bash',
          hooks: [{ type: 'command', command: hookCmd }]
        });
      }
      if (!existing.env) existing.env = {};
      existing.env.GATE_MCP_URL = '$GATE_MCP_URL';
      existing.env.GATE_TOKEN = '$GATE_TOKEN';
      fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(existing, null, 2) + '\n');
    "
    echo "  Updated ${SETTINGS_FILE}"
  else
    echo "  Node.js not found - cannot merge settings automatically."
    echo "  Add this to ${SETTINGS_FILE} manually:"
    echo ""
    cat <<CONF
  {
    "hooks": {
      "PreToolUse": [{
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node ${HOOK_FILE}" }]
      }]
    },
    "env": {
      "GATE_MCP_URL": "${GATE_MCP_URL}",
      "GATE_TOKEN": "${GATE_TOKEN}"
    }
  }
CONF
    exit 0
  fi
else
  cat > "$SETTINGS_FILE" <<CONF
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ${HOOK_FILE}"
          }
        ]
      }
    ]
  },
  "env": {
    "GATE_MCP_URL": "${GATE_MCP_URL}",
    "GATE_TOKEN": "${GATE_TOKEN}"
  }
}
CONF
  echo "  Created ${SETTINGS_FILE}"
fi

echo ""
echo "  Done. Start Claude Code and try: rm -rf ./test"
echo "  The command will hold until you approve in Gate."
echo ""
