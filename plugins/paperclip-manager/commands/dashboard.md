---
name: dashboard
description: Show a quick Paperclip status summary across all companies — active issues, agent health, pending approvals, and blockers
allowed-tools:
  - Bash
  - Read
---

# Paperclip Dashboard

Generate a concise status summary across all Paperclip companies. This is the ambient check-in view.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve server status and company list
2. If server is offline, report that and suggest `pnpm paperclipai run`
3. For each company, gather:
   - `pnpm --dir /var/home/axiom/paperclip paperclipai dashboard get -C <companyId> --json`
   - `pnpm --dir /var/home/axiom/paperclip paperclipai approval list -C <companyId> --status pending --json`
   - `pnpm --dir /var/home/axiom/paperclip paperclipai issue list -C <companyId> --status blocked --json`
4. Check `~/.paperclip-manager/last-seen.json` for timestamps of last dashboard view
5. Present a summary highlighting **what changed since last check**:
   - New or resolved issues
   - Status changes
   - New approvals needing attention
   - Agents that became idle or blocked
   - Budget warnings (agents above 80% spend)
6. Update `~/.paperclip-manager/last-seen.json` with current timestamp

## Output Format

Present as a clean markdown report. Use the operator's company names as section headers. Keep it scannable — tables for metrics, bullet lists for actionable items. Highlight blockers and pending approvals prominently.

Example structure:
```
## Paperclip Dashboard — <date>

### <Company Name> (<prefix>)
| Metric | Value |
|--------|-------|
| Active issues | 12 |
| Blocked | 2 |
| Agents online | 4/6 |
| Pending approvals | 1 |
| Monthly spend | $42.50 / $100.00 |

**Needs attention:**
- PAP-42 blocked: "Waiting on DBA review"
- Approval pending: CTO hire request

### <Company Name 2> ...
```

If `~/.paperclip-manager/` directory does not exist, create it. If `last-seen.json` does not exist, this is the first check — show full status without diff framing.
