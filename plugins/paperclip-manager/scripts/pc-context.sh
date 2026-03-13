#!/bin/bash
# Resolve Paperclip CLI context — API URL, company IDs, and connectivity.
# Used by hooks and commands to bootstrap Paperclip access.
# Outputs JSON with resolved context.
set -euo pipefail

PAPERCLIP_ROOT="${PAPERCLIP_ROOT:-/var/home/axiom/paperclip}"
CLI_BIN="pnpm --dir $PAPERCLIP_ROOT paperclipai"

# Check if Paperclip server is reachable
check_server() {
  local api_base
  api_base=$($CLI_BIN context show --json 2>/dev/null | jq -r '.apiBase // empty' 2>/dev/null || echo "")
  if [ -z "$api_base" ]; then
    api_base="http://localhost:3100"
  fi
  if curl -sf --max-time 2 "$api_base/api/health" >/dev/null 2>&1; then
    echo "$api_base"
    return 0
  fi
  return 1
}

# Get all companies
list_companies() {
  local api_base="$1"
  curl -sf --max-time 5 "$api_base/api/companies" 2>/dev/null || echo "[]"
}

# Main context resolution
main() {
  local api_base
  api_base=$(check_server) || {
    echo '{"status":"offline","error":"Paperclip server not reachable"}'
    exit 0
  }

  local companies
  companies=$(list_companies "$api_base")

  local context_json
  context_json=$($CLI_BIN context show --json 2>/dev/null || echo '')
  # Validate JSON, fall back to empty object
  if ! echo "$context_json" | jq . >/dev/null 2>&1; then
    context_json='{}'
  fi

  jq -n \
    --arg api_base "$api_base" \
    --arg status "online" \
    --argjson companies "$companies" \
    --argjson context "$context_json" \
    '{status: $status, apiBase: $api_base, companies: $companies, cliContext: $context}'
}

main "$@"
