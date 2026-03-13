---
name: onboard
description: Onboard an existing project into Paperclip — scan repo, create project with workspace, plan issues and goals, and test with an agent
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - AskUserQuestion
---

# Paperclip Project Onboarding

Guided workflow to onboard an existing project repository into the Paperclip control plane. This is a collaborative planning session — scan the project, register it in Paperclip, plan the work, and verify everything works with a test issue.

## Procedure

### Step 1: Discover the Project

Interview the operator:
- "Which project would you like to onboard? Give me the path to the repo."
- If no path given, ask for it

Scan the project:
- Read `README.md` or `README` for project overview
- Read `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, or equivalent for tech stack
- Check `git log --oneline -20` for recent activity and contributors
- Glob for key structure patterns (`src/`, `lib/`, `tests/`, `docs/`)
- Check for existing CI/CD (`.github/workflows/`, `.gitlab-ci.yml`)
- Check for existing issue tracking (`.github/ISSUES/`, TODO comments)

Summarize findings: project name, description, tech stack, recent activity, structure overview.

### Step 2: Choose the Company

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/pc-context.sh
```

Present the available companies and ask: "Which company should this project belong to?"

If the operator wants a new company, note that company creation requires the Paperclip web UI or direct API setup, and guide them through it.

### Step 3: Create the Paperclip Project

Interview for project details:
- **Name**: Suggest based on repo name, let operator confirm or rename
- **Description**: Draft from README scan, let operator refine
- **Status**: Suggest `active` for projects being worked on, `planned` for future work
- **Goals**: Ask if the project ladders up to an existing company goal, or if a new goal should be created

Create the project with workspace:
```bash
API_BASE="<resolved>"
curl -sf -X POST "$API_BASE/api/companies/<companyId>/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<name>",
    "description": "<description>",
    "status": "<status>",
    "workspace": {
      "name": "<repo-name>",
      "cwd": "<absolute-path-to-repo>",
      "repoUrl": "<git-remote-url-if-available>",
      "repoRef": "<default-branch>",
      "isPrimary": true
    }
  }'
```

If a new goal is needed, create it first:
```bash
curl -sf -X POST "$API_BASE/api/companies/<companyId>/goals" \
  -H "Content-Type: application/json" \
  -d '{"title": "...", "description": "...", "level": "company", "status": "active"}'
```

### Step 4: Plan Issues and Goals

This is a collaborative planning session. Work with the operator to identify initial work items:

1. **Review what was found** in the repo scan — TODOs, open items, README mentions of planned work
2. **Interview the operator**:
   - "What are the main things that need to happen with this project?"
   - "Are there immediate priorities or blockers?"
   - "Who should work on what?" (show agent roster for the company)
3. **Draft issues together**: For each piece of work:
   - Suggest title, description, priority, and assignee
   - Ask operator to confirm or adjust
   - Create via `paperclipai issue create` with `--project-id` set

Set `parentId` on subtasks. Set `goalId` when issues ladder up to goals.

### Step 5: Test with an Agent

Create a small, well-defined test issue to verify the onboarding works:

1. Ask: "Which agent should we give a test task to? Something small to verify the setup works."
2. Show agent roster for the company
3. Create a test issue:
   - Title: Something concrete and completable (e.g., "Verify project workspace setup and post a hello comment")
   - Description: Clear instructions for the agent to follow
   - Assign to the chosen agent
   - Set status to `todo`
4. Offer to trigger a heartbeat for that agent:
   ```bash
   pnpm --dir /var/home/axiom/paperclip paperclipai heartbeat run --agent-id <agentId> --json
   ```
5. Monitor the result and report back to the operator

### Step 6: Summary

Present a summary of everything created:
- Project name and ID
- Workspace configuration
- Goals created
- Issues created (table: identifier, title, assignee, priority, status)
- Test issue result

## Interaction Style

This is the most interview-heavy command. Every step involves the operator. Never auto-create without confirmation. Present drafts and let the operator shape them. The goal is collaborative planning, not automation.
