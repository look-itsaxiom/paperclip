---
name: agents
description: View and manage Paperclip agents — roster, status, budgets, org chart, and assignments
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Paperclip Agents

Interactive agent roster viewer and manager. Provides visibility into agent health, assignments, budgets, and organizational structure.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context and company list
2. **Interview the operator** to understand intent:
   - "Which company's agents would you like to look at, or all of them?"
   - "What are you interested in?" — offer options:
     - Agent roster overview (all agents with status and budget)
     - Org chart (hierarchical view)
     - Specific agent deep-dive (assignments, budget, activity)
     - Agent health check (who's idle, blocked, over budget)
3. Execute based on intent:

### Roster Overview
```bash
pnpm --dir /var/home/axiom/paperclip paperclipai agent list -C <companyId> --json
```

Present as table: name, role, title, status, budget used/total, reports-to.

### Org Chart
```bash
curl -sf "<apiBase>/api/companies/<companyId>/org"
```

Present as indented tree showing reporting structure.

### Agent Deep-Dive
```bash
# Agent details
pnpm --dir /var/home/axiom/paperclip paperclipai agent get <agentId> --json

# Their assignments
pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --assignee-agent-id <agentId> --json

# Their costs
curl -sf "<apiBase>/api/companies/<companyId>/costs/by-agent"
```

Present: full agent profile, current assignments with statuses, budget utilization, chain of command.

### Health Check
For each company, list agents and flag:
- Agents above 80% monthly budget
- Agents with status "idle" but assigned in_progress tasks
- Agents with blocked tasks
- Agents with no assignments

## Cross-Company View

When the operator asks about all companies, iterate over each company and present a unified view. Use company name as section headers.

## Interaction Style

Interview first. After showing initial data, offer drill-down options: "Want to look at a specific agent's assignments?" or "Should I check who's over budget?"
