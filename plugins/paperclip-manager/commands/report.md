---
name: report
description: Generate a comprehensive deep-dive report across all Paperclip companies — full agent roster, issue breakdown, project status, goals, costs, and org chart
allowed-tools:
  - Bash
  - Read
---

# Paperclip Full Report

Generate an exhaustive report covering every dimension of the Paperclip control plane across all companies. This is the deep-dive counterpart to `/pc:dashboard`.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context
2. If server is offline, report that and stop
3. For each company, gather ALL of the following:

**Via CLI:**
- `pnpm --dir /var/home/axiom/paperclip paperclipai company get <companyId> --json`
- `pnpm --dir /var/home/axiom/paperclip paperclipai agent list -C <companyId> --json`
- `pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --json`
- `pnpm --dir /var/home/axiom/paperclip paperclipai approval list -C <companyId> --json`
- `pnpm --dir /var/home/axiom/paperclip paperclipai dashboard get -C <companyId> --json`
- `pnpm --dir /var/home/axiom/paperclip paperclipai activity list -C <companyId> --json`

**Via API (not in CLI):**
- `curl -sf <apiBase>/api/companies/<companyId>/projects`
- `curl -sf <apiBase>/api/companies/<companyId>/goals`
- `curl -sf <apiBase>/api/companies/<companyId>/costs/summary`
- `curl -sf <apiBase>/api/companies/<companyId>/costs/by-agent`
- `curl -sf <apiBase>/api/companies/<companyId>/costs/by-project`
- `curl -sf <apiBase>/api/companies/<companyId>/org`

4. Compile into a structured report

## Report Sections (per company)

### Company Overview
- Name, description, budget, status

### Org Chart
- Hierarchical view of agents and reporting structure

### Agent Roster
- Table: name, role, status, budget used/total, current task
- Flag agents above 80% budget or idle with assigned work

### Issues
- By status: breakdown counts
- Table of in-progress and blocked issues with assignees
- Stale issues (in_progress for >3 days with no recent comments)

### Projects
- Table: name, status, workspace info, issue count

### Goals
- Table: title, level, status, linked projects

### Costs
- Summary: total spend, budget remaining
- By agent: spend per agent
- By project: spend per project
- Trend: compare to previous period if data available

### Approvals
- Pending approvals needing board action
- Recently resolved approvals

### Activity
- Recent activity log (last 20 entries)

## Output Format

Full markdown report with clear headers, tables, and analysis. Include actionable recommendations at the end of each company section (e.g., "Consider unblocking PAP-42 — it's been blocked for 5 days").
