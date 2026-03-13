---
name: costs
description: View Paperclip cost breakdowns — summary, by-agent, by-project, and budget health across all companies
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Paperclip Costs

Interactive cost and budget viewer across all companies. Uses API-only endpoints (not available in CLI).

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context
2. **Interview the operator**:
   - "Would you like to see costs for a specific company or across all?"
   - "What view are you interested in?"
     - Overall summary
     - Breakdown by agent
     - Breakdown by project
     - Budget health check (who's near limits)

3. Gather data via API:
   ```bash
   API_BASE="<resolved>"

   # Summary
   curl -sf "$API_BASE/api/companies/<companyId>/costs/summary"

   # By agent
   curl -sf "$API_BASE/api/companies/<companyId>/costs/by-agent"

   # By project
   curl -sf "$API_BASE/api/companies/<companyId>/costs/by-project"

   # Company budget
   pnpm --dir /var/home/axiom/paperclip paperclipai company get <companyId> --json
   # (includes budgetMonthlyCents, spentMonthlyCents)

   # Agent budgets
   pnpm --dir /var/home/axiom/paperclip paperclipai agent list -C <companyId> --json
   # (includes budgetMonthlyCents, spentMonthlyCents per agent)
   ```

4. Present based on requested view:

### Summary View
| Company | Monthly Budget | Spent | Remaining | Utilization |
|---------|---------------|-------|-----------|-------------|

### By Agent View
| Agent | Role | Budget | Spent | % Used | Status |
|-------|------|--------|-------|--------|--------|
Flag agents above 80% in bold.

### By Project View
| Project | Total Spend | Issue Count | Avg Cost/Issue |
|---------|-------------|-------------|----------------|

### Budget Health
Flag and highlight:
- Agents above 80% monthly budget
- Companies above 80% monthly budget
- Projects with no budget tracking
- Runaway cost trends

5. After presenting, offer: "Want to adjust any budgets, or drill into a specific area?"

## Interaction Style

Lead with the most actionable information. If anyone is near budget limits, highlight that first before showing the full breakdown.
