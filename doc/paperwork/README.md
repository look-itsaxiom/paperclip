# Paperwork

**Paperclip's infrastructure + Open Workshop's methodology = Paperwork**

Fork: `look-itsaxiom/paperclip` branch `experiment/open-workshop-integration`
Date: 2026-03-11

---

## System Comparison: Open Workshop | Paperclip | Paperwork

### Architecture

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Runtime** | Claude Code plugin (stateless) | Express 5 server + React UI | Express 5 server + React UI + CLI plugin |
| **Data store** | Flat YAML/MD files at `~/.open-workshop/` | PostgreSQL (embedded) via Drizzle ORM | PostgreSQL via Drizzle ORM |
| **Multi-tenancy** | Single user, single workspace | Multi-company, company-scoped everything | Multi-company, company-scoped everything |
| **Auth** | None (inherits Claude Code session) | BetterAuth (OAuth/magic link) + agent API keys + local trusted mode | Same as Paperclip |
| **Real-time** | None | WebSocket live events (in-memory EventEmitter per company) | Same as Paperclip |
| **Package structure** | Single plugin directory | pnpm monorepo: `packages/db`, `packages/shared`, `packages/adapters/*`, `server`, `ui` | Same as Paperclip + new schema/services/routes |

### Organizational Model

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Core unit** | Department (flat directory: `knowledge.md` + `tools.yaml`) | Agent (adapter config + role + permissions) | Department (DB-backed: knowledge_md + tools_yaml + skills) |
| **Agent identity** | None — Claude Code IS the agent; subagents are ephemeral | Persistent named agents with status, budget, adapter config, hierarchy (`reportsTo`) | Persistent agents spawned FROM departments (`agent.departmentId`) |
| **Agent creation** | Implicit (subagent spawned per dispatch) | Manual via API/UI with name, role, adapter type | Manual OR spawned from department template; `isEphemeral` flag for one-shot agents |
| **Capabilities** | Department `knowledge.md` injected into subagent prompt | Agent `role` field + manually configured instructions | Department `knowledgeMd` + department-scoped skills + global skills |
| **Hierarchy** | Flat (lead + subagents) | `reportsTo` UUID self-reference on agents | Same as Paperclip + department grouping |
| **Tool catalog** | `tools.yaml` per department (MCP servers, CLIs, cloud APIs) | Per-agent `adapterConfig` JSONB | Department `toolsYaml` + per-agent `adapterConfig` |

### Skills System

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Storage** | `~/.open-workshop/skills/<name>/SKILL.md` flat files | `skills/` directory in server, injected by adapters | `department_skills` table in PostgreSQL |
| **Scoping** | Global (all skills available to all subagents) | Global (all skills injected into every agent run) | Scoped: builtin + global (`departmentId IS NULL`) + department-specific |
| **Format** | YAML frontmatter (name, description, triggers) + markdown body | YAML frontmatter + markdown body | Same format, stored in `contentMd` column |
| **Discovery** | Progressive: metadata always loaded, full body on trigger match | All skills injected every run | Description-based semantic routing; only relevant skills injected |
| **Creation** | R&D compiles findings → `SKILL.md` files | Manual file creation | API: `POST /skills` or compile from findings via `POST /skills/compile` |
| **Source tracking** | None (file creation date only) | None | `sourceType`: manual / compiled / builtin; `sourceFindingId` links to R&D finding |

### Project Management

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Project record** | `projects/<slug>/profile.yaml` + `status.md` | `projects` table: name, description, status, leadAgentId, targetDate, workspaces | `projects` table enhanced: + statusMd, lifecycleState, overallProgress, totalSpendCents, roiRatio, techStack, keyPaths, lastBriefingAt |
| **Lifecycle states** | active / backlog / archived (in `_manifest.yaml`) | backlog / active / completed (status column) | Original `status` preserved + new `lifecycleState`: active / backlog / archived |
| **Lifecycle transitions** | Manual YAML edit; briefing written to `last-briefing.md` | Status update via API | API endpoints: `POST /cool`, `/reheat`, `/archive` — auto-generate context briefings |
| **Active limit** | Configurable in `config.yaml` (default 10) | None | Not enforced in code yet (schema ready) |
| **Milestones** | `milestones.yaml` per project (name, progress 0-100, status, description) | None | `milestones` table: progress 0-100, status, dependsOn JSONB, gate, sortOrder |
| **Progress tracking** | Manual update in `milestones.yaml` | None | `projects.overallProgress` = avg of milestone progress (auto-computed on milestone change) |
| **Workspaces** | `profile.yaml` has `path` field pointing to local repo | `project_workspaces` table: cwd, repoUrl, repoRef, isPrimary | Same as Paperclip (unchanged) |
| **Workspace execution** | N/A (Claude Code works in cwd) | `executionWorkspacePolicy` JSONB: project_primary / isolated / git_worktree strategies | Same as Paperclip (unchanged) |

### Work Tracking & Cost

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Work log** | `ledger.yaml` per project: date, type, department, description, progress_delta, files_changed | `activity_log` table: actor, action, entity, details JSONB | Both: `activity_log` (unchanged) + new `ledger_entries` table with rich schema |
| **Ledger entry fields** | date, type, department, description, progress_delta, files_changed, notes, engine_used | N/A | projectId, departmentId, agentId, issueId, runId, entryType, description, progressDelta, milestoneImpacts JSONB, filesChanged JSONB, estimatedCostUsd, engineUsed, notes, occurredAt |
| **Cost tracking** | `cost-log.jsonl` (SubagentStop hook parses transcript for tokens, applies pricing) | `cost_events` table: provider, model, inputTokens, outputTokens, costCents per LLM call | Both: `cost_events` (unchanged, per-LLM-call) + `ledger_entries.estimatedCostUsd` (per-work-item) |
| **Budget** | None (cost-log is observational only) | Per-agent + per-company `budgetMonthlyCents` / `spentMonthlyCents`; auto-pause on overspend | Same as Paperclip + `project_budget` service (foundation for per-project budgets) |
| **ROI** | Manual: `roi_ratio` in `ledger.yaml` summary | None | `projects.roiRatio` = overallProgress / (totalSpendCents / 100); auto-recomputed on ledger entry creation and after cost-bearing runs |
| **Spend rollup** | Manual in YAML | Per-agent and per-company monthly spend | `projects.totalSpendCents` = sum(ledgerEntries.estimatedCostUsd * 100) + sum(costEvents.costCents) for that project |

### Agent Execution

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Scheduler** | None (user triggers everything) | Heartbeat service: 30s interval, wakeup queue, per-agent run locks, lifecycle guards | Same heartbeat + department skill injection + project warm-start + lifecycle guard (skip non-active projects) + ROI recompute post-run |
| **Execution model** | Claude Code subagents / agent-teams / external CLI dispatch (Codex, Gemini) | 8 adapters: claude_local, codex_local, cursor, opencode_local, pi_local, openclaw_gateway, process, http | Same 8 adapters + enhanced claude_local: writes department SKILL.md files to temp dir + project-context.md |
| **Session persistence** | None (subagents are ephemeral) | `agentRuntimeState` table + adapter-specific session codecs; sessions survive server restarts | Same as Paperclip (unchanged) |
| **Context injection** | SessionStart hook injects dashboard + project statuses as `additionalContext` | Adapter `execute()` receives agent config + workspace + issue context | Enhanced: adapter receives department knowledge/skills + project warm-start context (status, briefing, milestones, recent ledger) |
| **Dispatch** | User says "dispatch to engineering" → subagent spawned with dept knowledge | User creates issue → assigns to agent → heartbeat picks it up | Both paths: direct dispatch via `POST /departments/:id/spawn-agent` OR issue assignment; heartbeat resolves department context |
| **Runtime services** | None | `workspace_runtime_services` table: services started during runs (ports, processes), reuse keys, lifecycle (shared/ephemeral) | Same as Paperclip (unchanged) |

### Context & Warm-Start

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Session start** | Hook reads YAML files, injects all active project statuses + config as text | No pre-loading; agent reads state on first turn | Heartbeat assembles warm-start: project status, milestones, latest briefing, recent ledger, department knowledge |
| **Context briefings** | `last-briefing.md` written manually on project transitions | None | `project_context_briefings` table: auto-generated on cool/reheat/archive, manual creation via API |
| **Backlog recovery** | Read `last-briefing.md` when reactivating a project | N/A (no backlog concept beyond status field) | Latest briefing loaded on reheat; full `getProjectContext()` returns project + briefing + active milestones + recent ledger |
| **Knowledge injection** | Department `knowledge.md` prepended to subagent prompt | None (agent role field only) | Department `knowledgeMd` written to temp dir as context for adapter |

### Self-Evolution

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **R&D department** | Special department that can create other departments + compile findings into skills | None | R&D department auto-seeded on company creation; builtin agent templates (rd-researcher, rd-skill-compiler) |
| **Findings** | Markdown files in `departments/research-and-development/findings/` | None | `findings` table: title, slug, contentMd, departmentId, compiledSkillId |
| **Finding → Skill pipeline** | `/compile-findings` command reads findings, generates SKILL.md files | None | `POST /skills/compile` + `skillCompilerService.compile(findingId)`: creates/updates department_skill, links `finding.compiledSkillId` |
| **Department creation** | R&D agent creates directory with `knowledge.md` + `tools.yaml` | N/A | R&D agent calls `POST /departments` API |
| **Revision history** | Git history on flat files | `agent_config_revisions` for agents | `department_revisions` table: changedFields, beforeSnapshot, afterSnapshot JSONB; rollback support |

### Dashboard

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Content** | Active projects with status + ledger summary; config; backlog list | Agent counts by status, issue counts by status, pending approvals, monthly spend vs budget | All of Paperclip + department count, project lifecycle breakdown (active/backlog/archived counts), active milestones, recent ledger entries |
| **Delivery** | Injected as text via SessionStart hook `additionalContext` | JSON API: `GET /api/companies/:companyId/dashboard` | Same API endpoint, enhanced response payload |
| **Real-time** | None (snapshot at session start) | WebSocket live events | Same as Paperclip |

### Persistence & Portability

| Concern | Open Workshop | Paperclip | Paperwork |
|---------|--------------|-----------|-----------|
| **Data format** | YAML + Markdown flat files (git-friendly, human-readable) | PostgreSQL (Drizzle ORM, migration-tracked) | PostgreSQL (same as Paperclip) |
| **Backup** | `git add ~/.open-workshop/ && git commit` | Database dump; `companyPortabilityService` for export/import | Same as Paperclip |
| **Portability** | Copy `~/.open-workshop/` directory anywhere | JSON export/import per company | Same as Paperclip |
| **Schema migrations** | N/A (flat files, no schema) | Drizzle Kit `generate` + `migrate` | Same; migration `0028_nappy_harrier.sql` adds all Paperwork tables |

---

## Code-Level Diff: Design vs Implementation

This section documents how each Paperwork feature was actually implemented versus the design spec, and how the equivalent works in Open Workshop and original Paperclip.

### Departments

**Design spec said:** Departments as capability definitions with knowledge, tools, skills. Agents spawned from departments.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/departments.ts` | `departments` table with id, companyId, slug (unique per company), name, description, knowledgeMd, toolsYaml, metadata, createdByAgentId/UserId |
| Schema | `packages/db/src/schema/department_revisions.ts` | Immutable revision log: changedFields array, beforeSnapshot/afterSnapshot JSONB, changedByAgentId/UserId |
| Service | `server/src/services/departments.ts` | Factory function `departmentsService(db)` returning: list (with search), get, getBySlug, create, update (auto-creates revision on diff), delete, listRevisions, rollback (restores beforeSnapshot from a revision) |
| Routes | `server/src/routes/departments.ts` | 7 endpoints under `/companies/:companyId/departments` + spawn-agent convenience endpoint |
| Seed | `server/src/routes/companies.ts` | On `POST /companies`, auto-creates R&D department (slug: "research-and-development") |

**Compared to Open Workshop:** Open Workshop departments are directories (`~/.open-workshop/departments/<slug>/knowledge.md` + `tools.yaml`). No revision history, no rollback, no search. Creation is `mkdir` + write files. The knowledge and tools content is identical in concept — Paperwork just stores it in PostgreSQL instead of the filesystem.

**Compared to Paperclip:** Original Paperclip has no department concept. Agent capabilities are defined by `agent.role` (text field) and `agent.adapterConfig` (JSONB). There's no shared knowledge base between agents. Each agent is independently configured.

**Gap from design:** Design mentions active project limit enforcement on departments — not implemented. Department-based agent templates partially implemented via `agent-templates.ts` but not fully wired to department CRUD.

---

### Skills (Department-Scoped)

**Design spec said:** Skills scoped to departments. Injection logic: builtin + global (departmentId IS NULL) + department-specific.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/department_skills.ts` | `department_skills` table: departmentId (nullable = global), slug, name, description, contentMd, sourceType (manual/compiled/builtin), sourceFindingId |
| Service | `server/src/services/department-skills.ts` | `departmentSkillsService(db)`: list, get, create, update, delete + `listForAgent(companyId, departmentId)` — union of dept-scoped + global skills |
| Routes | `server/src/routes/department-skills.ts` | 5 CRUD endpoints under `/companies/:companyId/skills` |
| Injection | `server/src/services/heartbeat.ts` | Before adapter execute: queries `listForAgent()`, sets `context.paperclipDepartmentSkills` |
| Injection | `packages/adapters/claude-local/src/server/execute.ts` | Writes each skill as `dept-{slug}/SKILL.md` in temp directory alongside existing skills |

**Compared to Open Workshop:** Skills are `~/.open-workshop/skills/<name>/SKILL.md` files. All skills are global (no department scoping). Progressive disclosure: metadata always loaded, full body on trigger. No source tracking.

**Compared to Paperclip:** Original Paperclip has a `skills/` directory in the server package. All skills are injected into every agent run indiscriminately. No database backing, no scoping, no compilation pipeline.

**Gap from design:** Design mentions "description-based semantic routing" for skill discovery — not implemented. All department skills are injected for the agent's department; there's no runtime matching based on task description.

---

### Milestones

**Design spec said:** Milestones with progress (0-100), dependencies, auto-computed `overallProgress` on projects.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/milestones.ts` | `milestones` table: projectId, name, description, progress (int 0-100), status (pending/active/done), dependsOn JSONB, gate text, sortOrder |
| Service | `server/src/services/milestones.ts` | `milestonesService(db)`: list (ordered by sortOrder), get, create, update, delete. Private `computeOverallProgress()`: averages all milestone progress → writes to `projects.overallProgress` |
| Routes | `server/src/routes/milestones.ts` | 5 endpoints nested under `/companies/:companyId/projects/:projectId/milestones` |

**Compared to Open Workshop:** Milestones in `milestones.yaml` per project — ordered list with name, progress, status, description. No dependencies, no gates, no auto-computation. Progress updated manually.

**Compared to Paperclip:** No milestone concept. Projects have `status` (backlog/active/completed) but no granular progress tracking.

**Implementation detail:** `computeOverallProgress()` fires after every create/update/delete. It does a simple average: `Math.round(sum(progress) / count)`. This means a project with milestones at [100, 0, 0] shows 33% overall. Open Workshop's approach is similar (manual average) but the computation is done by the user/agent writing the YAML.

---

### Ledger Entries

**Design spec said:** Work log linking effort to milestones, cost, departments, agents, issues, and runs.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/ledger_entries.ts` | Rich schema: projectId, departmentId, agentId, issueId, runId, entryType, description, progressDelta, milestoneImpacts JSONB, filesChanged JSONB, estimatedCostUsd, engineUsed, notes, occurredAt |
| Service | `server/src/services/ledger-entries.ts` | list (per-project, paginated), listByCompany, get, create, summary. Private `recomputeProjectSpend()`: sums `ledgerEntries.estimatedCostUsd` + `costEvents.costCents` → writes `projects.totalSpendCents` + `projects.roiRatio` |
| Routes | `server/src/routes/ledger-entries.ts` | 5 endpoints: per-project list, company-wide list, get, create, summary |

**Compared to Open Workshop:** `ledger.yaml` entries have: date, type, department, description, progress_delta, files_changed, notes, engine_used. No linkage to agents, issues, or runs (those don't exist in Open Workshop). Cost is `estimated_cost_usd` per entry. Summary section has `total_estimated_spend`, `overall_progress`, `roi_ratio`.

**Compared to Paperclip:** No ledger concept. Cost tracking lives in `cost_events` table (per-LLM-call granularity). Activity logging in `activity_log` table (action + entity + details). Neither provides work-level aggregation or progress tracking.

**Key difference from both:** Paperwork's `recomputeProjectSpend()` merges TWO cost sources:
1. `ledgerEntries.estimatedCostUsd` — human-estimated cost per work item
2. `costEvents.costCents` — actual LLM token costs from adapter runs

This gives a hybrid view: estimated + actual spend per project. ROI = `overallProgress / (totalSpendCents / 100)`.

---

### Project Lifecycle

**Design spec said:** cool/reheat/archive with auto-briefings, warm-start context assembly.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/project_context_briefings.ts` | Briefing table: triggerEvent (cooled/reheated/archived/milestone_completed/manual), contentMd, createdByAgentId/UserId |
| Schema | `packages/db/src/schema/projects.ts` (modified) | Added: statusMd, lifecycleState, activeProjectOrder, overallProgress, totalSpendCents, roiRatio, techStack, keyPaths, lastBriefingAt |
| Service | `server/src/services/project-lifecycle.ts` | `cool()`: sets lifecycleState=backlog, inserts briefing. `reheat()`: sets lifecycleState=active, copies latest briefing as "reheated" entry. `archive()`: sets lifecycleState=archived + archivedAt. Plus: listBriefings, createBriefing, getLatestBriefing, `getProjectContext()` |
| Routes | `server/src/routes/project-lifecycle.ts` | 6 endpoints: cool, reheat, archive, list briefings, create briefing, get project context |
| Warm-start | `server/src/services/heartbeat.ts` | Before agent run: calls `getProjectContext()` → sets `context.paperclipProjectContext` with project + briefing + milestones + recent ledger |
| Warm-start | `packages/adapters/claude-local/src/server/execute.ts` | Writes `project-context.md` to temp dir with formatted status, briefing, milestones, recent work |
| Guard | `server/src/services/heartbeat.ts` | Lifecycle guard: if project.lifecycleState is not "active", cancel the run |

**Compared to Open Workshop:** Lifecycle managed via `_manifest.yaml` (active/backlog/archived arrays). Context briefings are `last-briefing.md` files written manually. SessionStart hook reads all active project statuses. No API, no guards, no auto-briefing generation.

**Compared to Paperclip:** Projects have `status` (backlog/active/completed) and `archivedAt`. No lifecycle transitions, no briefings, no warm-start. Agents discover project state by reading the codebase on each run.

**`getProjectContext()` returns:**
```typescript
{
  project,           // full project row
  latestBriefing,    // most recent briefing or null
  activeMilestones,  // milestones where status=active or progress<100
  recentLedgerEntries // last 10 ledger entries
}
```

This is the warm-start payload. The claude_local adapter formats it as markdown and writes it to the agent's working directory.

---

### Self-Evolution (R&D Pipeline)

**Design spec said:** R&D department auto-seeded, findings→skills compilation, agent templates for R&D tasks.

**What was actually built:**

| Layer | File | What it does |
|-------|------|-------------|
| Schema | `packages/db/src/schema/findings.ts` | Findings table: departmentId, title, slug, contentMd, compiledSkillId (FK to department_skills) |
| Service | `server/src/services/findings.ts` | CRUD with actor tracking (createdByAgentId/UserId) |
| Service | `server/src/services/skill-compiler.ts` | `compile(companyId, findingId, actor)`: reads finding → creates/updates department_skill with sourceType=compiled, links finding.compiledSkillId |
| Service | `server/src/services/agent-templates.ts` | Builtin templates: "rd-researcher" and "rd-skill-compiler" with predefined roles, capabilities, adapter config. `spawn()` creates agent from template |
| Routes | `server/src/routes/findings.ts` | 5 CRUD endpoints + compile |
| Routes | `server/src/routes/agent-templates.ts` | GET /agent-templates, POST /agent-templates/:slug/spawn |
| Seed | `server/src/routes/companies.ts` | R&D department created on company creation |

**Compared to Open Workshop:** Findings live in `departments/research-and-development/findings/`. The `/compile-findings` slash command reads findings and generates `SKILL.md` files. Department creation is R&D writing files. The pipeline is the same concept, but executed via Claude Code file I/O instead of API calls.

**Compared to Paperclip:** No R&D concept, no findings, no skill compilation, no agent templates. Agents are manually created and configured.

**Gap from design:** The skill compiler does a simple 1:1 mapping (finding → skill). It doesn't do the semantic analysis or trigger-phrase extraction that Open Workshop's compile-findings command does. The finding's `contentMd` becomes the skill's `contentMd` directly — no summarization or restructuring.

---

### Heartbeat Integration

**Design spec said:** Heartbeat resolves department context and project warm-start before each agent run.

**What was actually modified in `server/src/services/heartbeat.ts`:**

1. **Department skills injection** — After resolving agent, queries `departmentSkillsService.listForAgent(companyId, agent.departmentId)`, attaches array to `context.paperclipDepartmentSkills`
2. **Project warm-start** — For project-scoped runs, calls `projectLifecycleService.getProjectContext(companyId, projectId)`, attaches to `context.paperclipProjectContext`
3. **Lifecycle guard** — If the project's `lifecycleState` is not "active", cancels the run with reason "project not active"
4. **ROI recompute** — After cost-bearing runs complete, calls `ledgerEntriesService.recomputeProjectSpend(companyId, projectId)`

The heartbeat service is ~1600 lines. These 4 modifications are surgical additions at specific injection points — they don't change the existing wakeup/execute/complete flow.

---

### Adapter Modifications

**Only `claude_local` was modified** (`packages/adapters/claude-local/src/server/execute.ts`):

1. **Department skills** — If `context.paperclipDepartmentSkills` exists, writes each skill as `dept-{slug}/SKILL.md` in the temporary skills directory. Same YAML frontmatter + markdown format as existing skills.

2. **Project context** — If `context.paperclipProjectContext` exists, writes `project-context.md` to temp dir with formatted sections:
   - Project status (name, lifecycle, progress, spend)
   - Latest briefing content
   - Active milestones table
   - Recent work (last 10 ledger entries)

Other 7 adapters (codex_local, cursor, opencode_local, pi_local, openclaw_gateway, process, http) are unchanged.

---

### CLI Plugin (Foundation)

**Design spec said:** Thin client calling Paperwork API, replacing Open Workshop's file I/O.

**What was actually built:**

| File | What it does |
|------|-------------|
| `server/src/cli-plugin/paperwork-client.ts` | Fetch-based HTTP client wrapping all Paperwork API endpoints. Methods for: dashboard, departments, skills, findings, milestones, ledger, lifecycle, agent-templates |
| `server/src/cli-plugin/session-warmstart.ts` | `assembleSessionWarmStart(client, companyId)`: parallel fetches for dashboard + projects + departments → formats into text block for Claude Code `additionalContext` |
| `server/src/cli-plugin/department-dispatch.ts` | `dispatchToDepartment(client, companyId, deptSlug, task)`: finds/creates agent from department → creates wakeup request |
| `server/src/cli-plugin/index.ts` | Barrel exports |

**Gap from design:** These are TypeScript modules inside the server package, not an actual Claude Code plugin. The design called for rewriting the Open Workshop SessionStart hook to call the Paperwork API — that rewrite hasn't happened yet. These modules are the building blocks for it.

---

### Dashboard (Enhanced)

**Original Paperclip dashboard returns:**
- Agent counts by status (active, running, paused, error)
- Issue counts by status (open, inProgress, blocked, done)
- Pending approvals count
- Monthly spend vs budget (utilization percentage)

**Paperwork adds:**
- Department count
- Project lifecycle breakdown (active/backlog/archived counts)
- Active milestones (across all projects)
- Recent ledger entries (last 10 across all projects)

**Open Workshop dashboard** (injected via SessionStart hook):
- Workshop name + config
- Full manifest (active/backlog/archived project lists)
- Per-project: complete `status.md` + `ledger.yaml` summary

The key difference: Open Workshop's dashboard is a text dump of everything (can be 5000+ tokens). Paperwork's dashboard is structured JSON via API, with the CLI plugin responsible for formatting.

---

## What's Inherited, What's New, What's Missing

### From Paperclip (kept unchanged)
- Express 5 server + middleware stack
- Drizzle ORM + embedded PostgreSQL
- React + Vite UI
- All 8 adapter types and their execution flow
- Heartbeat scheduler (core loop, wakeup system, run lifecycle)
- Agent sessions and runtime state
- Issue/task model with status transitions
- Goal hierarchy (task/epic/initiative)
- Cost events per LLM call
- Per-agent and per-company budget enforcement
- Secrets management (encrypted, versioned)
- Workspace runtime services (ports, processes)
- Execution workspace policies (project_primary, git_worktree)
- Activity log
- WebSocket live events
- Company portability (export/import)
- BetterAuth + agent API keys
- Permission grants system

### From Open Workshop (ported to database)
- Department model (knowledge + tools + skills as the core organizational unit)
- Skills scoped to departments (not global-only)
- Project milestones with progress tracking
- Ledger entries linking work to progress and cost
- ROI ratio as first-class metric
- Project lifecycle (active/backlog/archived) with transitions
- Context briefings for cold-start recovery
- Session warm-start (pre-loading context before agent runs)
- R&D self-evolution (findings → skills pipeline)
- Agent templates for repeatable agent creation

### New to Paperwork (in neither parent)
- Department revision history with before/after JSONB snapshots and rollback
- Hybrid cost rollup (estimated from ledger + actual from cost_events)
- Lifecycle guard in heartbeat (skip runs for non-active projects)
- ROI recompute triggered automatically after cost-bearing runs
- Project budget service (foundation, not fully enforced yet)
- Skill source tracking (manual/compiled/builtin with finding linkage)
- Department-scoped skill injection in adapter execution

### Missing / Not Yet Implemented
- **CLI plugin rewrite**: The session-warmstart and department-dispatch modules exist as TypeScript but aren't wired into an actual Claude Code plugin hook
- **Semantic skill routing**: Skills are injected by department membership, not by matching task description to skill triggers
- **Active project limit enforcement**: Schema supports `activeProjectOrder` but no enforcement logic
- **Agent template UI**: Templates exist in code but no UI to browse/spawn them
- **Department UI**: API exists but no React components for department management
- **Milestone dependencies**: `dependsOn` JSONB field exists but no dependency resolution logic (e.g., blocking gates)
- **Ephemeral agent cleanup**: `isEphemeral` flag exists on agents but no automatic cleanup after task completion
- **Multi-engine dispatch**: Open Workshop dispatches to Codex/Gemini CLI engines; Paperwork's CLI plugin modules don't include engine routing
- **Cost-log JSONL integration**: Open Workshop's per-token cost tracking via transcript parsing isn't replicated; Paperwork relies on adapter-reported `costUsd` in execution results

---

## Route Summary

### New Routes (Paperwork additions)

```
# Departments
GET    /api/companies/:companyId/departments
POST   /api/companies/:companyId/departments
GET    /api/companies/:companyId/departments/:id
PATCH  /api/companies/:companyId/departments/:id
DELETE /api/companies/:companyId/departments/:id
GET    /api/companies/:companyId/departments/:id/revisions
POST   /api/companies/:companyId/departments/:id/revisions/:revisionId/rollback
POST   /api/companies/:companyId/departments/:id/spawn-agent

# Department Skills
GET    /api/companies/:companyId/skills
POST   /api/companies/:companyId/skills
GET    /api/companies/:companyId/skills/:id
PATCH  /api/companies/:companyId/skills/:id
DELETE /api/companies/:companyId/skills/:id

# Findings
GET    /api/companies/:companyId/findings
POST   /api/companies/:companyId/findings
GET    /api/companies/:companyId/findings/:id
PATCH  /api/companies/:companyId/findings/:id
POST   /api/companies/:companyId/findings/:id/compile

# Milestones
GET    /api/companies/:companyId/projects/:projectId/milestones
POST   /api/companies/:companyId/projects/:projectId/milestones
GET    /api/companies/:companyId/projects/:projectId/milestones/:id
PATCH  /api/companies/:companyId/projects/:projectId/milestones/:id
DELETE /api/companies/:companyId/projects/:projectId/milestones/:id

# Ledger Entries
GET    /api/companies/:companyId/projects/:projectId/ledger
GET    /api/companies/:companyId/ledger
POST   /api/companies/:companyId/projects/:projectId/ledger
GET    /api/companies/:companyId/projects/:projectId/ledger/summary
GET    /api/companies/:companyId/ledger/:id

# Project Lifecycle
POST   /api/companies/:companyId/projects/:projectId/cool
POST   /api/companies/:companyId/projects/:projectId/reheat
POST   /api/companies/:companyId/projects/:projectId/archive
GET    /api/companies/:companyId/projects/:projectId/briefings
POST   /api/companies/:companyId/projects/:projectId/briefings
GET    /api/companies/:companyId/projects/:projectId/context

# Agent Templates
GET    /api/agent-templates
POST   /api/companies/:companyId/agent-templates/:slug/spawn
```

### Modified Routes
- `POST /api/companies` — Seeds R&D department on company creation
- `POST /api/companies/:companyId/agents` — Accepts `departmentId`, auto-populates capabilities from department
- `GET /api/companies/:companyId/projects` — Accepts `?lifecycle=active|backlog|archived` filter
- `GET /api/companies/:companyId/dashboard` — Returns enhanced payload with departments, lifecycle breakdown, milestones, ledger

---

## Schema Migration

All additions in `packages/db/src/migrations/0028_nappy_harrier.sql` (146 lines):

- 7 new tables: departments, department_revisions, department_skills, findings, milestones, ledger_entries, project_context_briefings
- 9 new columns on projects: statusMd, lifecycleState, activeProjectOrder, overallProgress, totalSpendCents, roiRatio, techStack, keyPaths, lastBriefingAt
- 2 new columns on agents: departmentId, isEphemeral
- All foreign keys, indexes, and unique constraints
- Backward compatible: all new columns are nullable or have defaults

---

## Service Pattern

All services follow Paperclip's factory function pattern:

```typescript
export function exampleService(db: Db) {
  // private helpers
  async function internalComputation(...) { ... }

  return {
    list: async (companyId: string, ...) => { ... },
    get: async (companyId: string, id: string) => { ... },
    create: async (companyId: string, data: {...}) => { ... },
    update: async (companyId: string, id: string, data: {...}) => { ... },
    delete: async (companyId: string, id: string) => { ... },
  };
}
```

No classes. No dependency injection framework. Every query filters on `companyId`. Services are instantiated in route files: `const svc = exampleService(db)`.
