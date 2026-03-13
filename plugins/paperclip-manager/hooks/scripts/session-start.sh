#!/bin/bash
# SessionStart hook for paperclip-manager plugin.
# Checks if Paperclip is running and provides ambient context.
# Outputs a system message that triggers the dashboard summary.
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$0")")}"
PAPERCLIP_ROOT="/var/home/axiom/paperclip"
STATE_DIR="$HOME/.paperclip-manager"
LAST_SEEN="$STATE_DIR/last-seen.json"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Check if Paperclip server is reachable
API_BASE="http://localhost:3100"
if ! curl -sf --max-time 2 "$API_BASE/api/health" >/dev/null 2>&1; then
  # Server not running — output a brief note and exit
  cat <<'ENDJSON'
{
  "systemMessage": "Paperclip server is not currently running. The operator can start it with `pnpm paperclipai run` if needed."
}
ENDJSON
  exit 0
fi

# Server is running — gather quick summary for context injection
COMPANIES=$(curl -sf --max-time 5 "$API_BASE/api/companies" 2>/dev/null || echo "[]")
COMPANY_COUNT=$(echo "$COMPANIES" | jq 'length' 2>/dev/null || echo "0")

if [ "$COMPANY_COUNT" -eq 0 ]; then
  cat <<'ENDJSON'
{
  "systemMessage": "Paperclip is running but no companies are configured yet."
}
ENDJSON
  exit 0
fi

# Build a brief context summary
COMPANY_NAMES=$(echo "$COMPANIES" | jq -r '.[].name' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

# Check for last-seen timestamp
LAST_CHECK="never"
if [ -f "$LAST_SEEN" ]; then
  LAST_CHECK=$(jq -r '.lastCheck // "never"' "$LAST_SEEN" 2>/dev/null || echo "never")
fi

# Output system message with context for the dashboard agent
cat <<ENDJSON
{
  "systemMessage": "Paperclip is online with $COMPANY_COUNT company/companies: $COMPANY_NAMES. Last dashboard check: $LAST_CHECK. Use the paperclip-reporter agent to generate an ambient dashboard summary showing what changed since last check. Keep the summary brief (10-15 lines) and highlight only actionable items."
}
ENDJSON
