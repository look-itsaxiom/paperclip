---
name: paperclip-admin
description: >
  This skill should be used when the user asks to interact with Paperclip in natural language,
  such as "create an issue", "assign this to the backend engineer", "what's the budget looking like",
  "check on agent status", "search for issues about auth", "create a project", "set up a goal",
  "trigger a heartbeat", "comment on PAP-42", "release that task", "show me the org chart",
  "what's the activity log", "check pending approvals", "hire an agent", "check costs",
  "set up a workspace", "generate an invite", or any other Paperclip control plane operation.
  Do NOT use this skill when the user invokes a /pc: slash command — those have their own instructions.
---

# Paperclip Admin — Natural Language Control Plane

Operate the Paperclip control plane on behalf of a board-level operator across all companies. The operator manages Paperclip from inside Claude Code as a personal assistant interface, replacing the browser UI and manual CLI usage.

## Context Resolution

Before any Paperclip operation, resolve the execution context:

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to get server status, API base URL, and company list
2. If the server is offline, inform the operator and suggest starting it with `pnpm paperclipai run`
3. If multiple companies exist and the request is ambiguous, ask which company the operator means
4. Cache the API base URL for subsequent calls in the conversation

The Paperclip CLI binary is available at: `pnpm --dir /var/home/axiom/paperclip paperclipai`

## Execution Model

**CLI-first**: Use the `paperclipai` CLI for operations it supports — it handles context resolution and output formatting. The CLI is available for: issues (list, get, create, update, comment, checkout, release), agents (list, get), companies (list, get, export, import), approvals (list, get, create, approve, reject, request-revision, resubmit, comment), activity (list), dashboard (get), and heartbeat (run).

**API fallback**: For operations not in the CLI — projects, goals, costs, budgets, workspaces, agent config — use `curl` against the API directly. The API base URL comes from context resolution. In `local_trusted` mode (default), no auth header is needed. If `PAPERCLIP_API_KEY` is set, include `Authorization: Bearer $PAPERCLIP_API_KEY`.

## CLI Command Patterns

Common CLI invocations (always include `--json` for parseable output):

```bash
# Issues
paperclipai issue list -C <companyId> --json
paperclipai issue list -C <companyId> --status todo,in_progress --json
paperclipai issue get <idOrIdentifier> --json
paperclipai issue create -C <companyId> --title "..." --description "..." --status todo --priority medium --assignee-agent-id <id> --json
paperclipai issue update <issueId> --status done --comment "..." --json
paperclipai issue comment <issueId> --body "..." --json
paperclipai issue checkout <issueId> --agent-id <id> --json
paperclipai issue release <issueId> --json

# Agents
paperclipai agent list -C <companyId> --json
paperclipai agent get <agentId> --json

# Companies
paperclipai company list --json
paperclipai company get <companyId> --json

# Approvals
paperclipai approval list -C <companyId> --json
paperclipai approval list -C <companyId> --status pending --json
paperclipai approval get <approvalId> --json
paperclipai approval approve <approvalId> --decision-note "..." --json
paperclipai approval reject <approvalId> --decision-note "..." --json

# Dashboard & Activity
paperclipai dashboard get -C <companyId> --json
paperclipai activity list -C <companyId> --json

# Heartbeat
paperclipai heartbeat run --agent-id <agentId> --json
```

## API-Only Operations

For projects, goals, costs, and budgets, use curl:

```bash
API_BASE="<resolved-api-base>"

# Projects
curl -sf "$API_BASE/api/companies/<companyId>/projects"
curl -sf -X POST "$API_BASE/api/companies/<companyId>/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"...","description":"...","status":"planned"}'

# Goals
curl -sf "$API_BASE/api/companies/<companyId>/goals"
curl -sf -X POST "$API_BASE/api/companies/<companyId>/goals" \
  -H "Content-Type: application/json" \
  -d '{"title":"...","description":"...","level":"company","status":"active"}'

# Costs
curl -sf "$API_BASE/api/companies/<companyId>/costs/summary"
curl -sf "$API_BASE/api/companies/<companyId>/costs/by-agent"
curl -sf "$API_BASE/api/companies/<companyId>/costs/by-project"
```

For the full endpoint reference, consult `references/api-reference.md`.

## Interaction Style

**Interview-first**: Always seek comprehensive understanding before acting. When a request is ambiguous:
- Ask which company (if multiple exist)
- Confirm details before creating/updating entities
- Clarify priority, assignee, project, and goal when creating issues
- Present options and let the operator choose

**Board-level perspective**: The operator is above all companies. Present information across companies when relevant. Never assume a single-company context.

**Concise reporting**: When showing results, format as readable markdown tables or bullet lists. Summarize large result sets. Highlight actionable items (blocked tasks, pending approvals, budget warnings).

## Additional Resources

### Reference Files

- **`references/api-reference.md`** — Full API endpoint reference with request/response schemas, all query parameters, and worked examples
