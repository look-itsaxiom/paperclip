---
name: company
description: View and manage Paperclip companies — list all, view details, switch CLI context, export/import configurations
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Paperclip Company Management

Board-level company browser and manager. View all companies, drill into details, and manage CLI context profiles.

## Procedure

1. Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh` to resolve context
2. **Interview the operator**:
   - "What would you like to do with companies?" — offer options:
     - List all companies with summary
     - Deep-dive into a specific company
     - Export a company configuration
     - Import a company configuration
     - Manage CLI context profiles

### List All Companies
```bash
pnpm --dir /var/home/axiom/paperclip paperclipai company list --json
```

Present as table: name, ID, prefix, status, budget, spend, agent count.

### Company Deep-Dive
```bash
pnpm --dir /var/home/axiom/paperclip paperclipai company get <companyId> --json
pnpm --dir /var/home/axiom/paperclip paperclipai agent list -C <companyId> --json
curl -sf "<apiBase>/api/companies/<companyId>/projects"
curl -sf "<apiBase>/api/companies/<companyId>/goals"
pnpm --dir /var/home/axiom/paperclip paperclipai dashboard get -C <companyId> --json
```

Present comprehensive company profile: metadata, agents, projects, goals, dashboard metrics.

### Export
```bash
pnpm --dir /var/home/axiom/paperclip paperclipai company export <companyId> --out <path> --json
```
Ask where to export. Report what was exported.

### Import
Interview for import details:
- Source path or URL
- Target: new company or merge into existing
- Agent collision handling (rename, skip, replace)

```bash
pnpm --dir /var/home/axiom/paperclip paperclipai company import --from <source> --target new --json
```
Offer `--dry-run` first to preview changes.

### CLI Context
```bash
# Show current context
pnpm --dir /var/home/axiom/paperclip paperclipai context show --json

# List profiles
pnpm --dir /var/home/axiom/paperclip paperclipai context list --json

# Switch profile
pnpm --dir /var/home/axiom/paperclip paperclipai context use <profile>
```

## Interaction Style

Present companies as peers — the operator manages all of them. When showing a list, include enough context to distinguish them. For import/export operations, always preview before executing.
