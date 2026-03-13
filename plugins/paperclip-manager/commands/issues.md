---
name: issues
description: Browse, search, and manage Paperclip issues interactively
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Paperclip Issues

Interactive issue browser and manager. Start by understanding what the operator wants to see or do, then execute.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context and company list
2. **Interview the operator** to understand intent. Ask:
   - "Which company's issues would you like to look at?" (list available companies)
   - "What are you looking for?" — offer options:
     - Browse all active issues (todo, in_progress, blocked)
     - Search for specific issues (by keyword, identifier, status, assignee, project)
     - Create a new issue
     - Update an existing issue
     - Bulk operations (e.g., "show me all blocked issues across all companies")
3. Execute based on intent:

### Browse / Search
```bash
# All active issues
pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --status todo,in_progress,blocked --json

# By status
pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --status <status> --json

# By assignee
pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --assignee-agent-id <agentId> --json

# Full text search (API only)
curl -sf "<apiBase>/api/companies/<companyId>/issues?q=<search-term>"

# By project
pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --project-id <projectId> --json
```

Present results as a table: identifier, title, status, priority, assignee. Offer to drill into any issue for full details and comment history.

### Create
Interview for all required fields:
- Title (required)
- Description (ask for context about what needs to be done)
- Priority (critical/high/medium/low — ask what feels right)
- Assignee (show agent roster for the company, ask who should own it)
- Project (show projects, ask if it belongs to one)
- Parent issue (ask if it's a subtask of something)
- Goal (ask if it ladders up to a company goal)

Confirm all details before creating. Use `paperclipai issue create`.

### Update
Fetch current issue state first with `paperclipai issue get <id> --json`. Show current values. Ask what to change. Confirm before applying with `paperclipai issue update`.

### Drill Into Issue
When the operator selects an issue for details:
- `pnpm --dir /var/home/axiom/paperclip paperclipai issue get <id> --json` — full issue with ancestors
- `curl -sf "<apiBase>/api/issues/<id>/comments"` — comment thread
- Present: title, description, status, priority, assignee, project, goal, parent chain, and full comment history
- Offer actions: update status, add comment, reassign, create subtask

## Interaction Style

Always interview. Never dump raw JSON. Format results as readable tables with clear headers. When showing issue details, use a structured card format. After each action, ask if the operator wants to do anything else with issues.
