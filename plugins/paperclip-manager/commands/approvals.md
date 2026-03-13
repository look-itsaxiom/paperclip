---
name: approvals
description: Review and act on pending Paperclip approvals — approve, reject, request revision, or comment
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Paperclip Approvals

Interactive approval management for board-level operators. Review pending approvals, see linked issues, and take action.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context
2. Gather pending approvals across all companies:
   ```bash
   pnpm --dir /var/home/axiom/paperclip paperclipai approval list -C <companyId> --status pending --json
   ```
   Run for each company.
3. If no pending approvals, report that and ask if the operator wants to see resolved approvals
4. If pending approvals exist, present them:

### Approval Summary Table
| # | Company | Type | Requested By | Summary | Created |
|---|---------|------|--------------|---------|---------|

5. **Interview**: "Which approval would you like to review?"
6. For the selected approval, show full details:
   ```bash
   pnpm --dir /var/home/axiom/paperclip paperclipai approval get <approvalId> --json
   ```
   Also fetch linked issues and comments:
   ```bash
   curl -sf "<apiBase>/api/approvals/<approvalId>/issues"
   curl -sf "<apiBase>/api/approvals/<approvalId>/comments"
   ```

7. Present the full context: type, payload, requesting agent, linked issues, comment thread
8. **Interview for action**: "What would you like to do?"
   - **Approve**: Ask for optional decision note, then `paperclipai approval approve <id> --decision-note "..."`
   - **Reject**: Ask for reason, then `paperclipai approval reject <id> --decision-note "..."`
   - **Request revision**: Ask what needs to change, then `paperclipai approval request-revision <id> --decision-note "..."`
   - **Comment**: Ask for comment body, then `paperclipai approval comment <id> --body "..."`
   - **Skip**: Move to next approval

9. After acting, ask if the operator wants to review another approval

## Interaction Style

Present approvals clearly with enough context to make a decision. For hire requests, show the proposed agent details (name, role, capabilities, budget). For strategy approvals, show the plan. Always confirm before taking action.
