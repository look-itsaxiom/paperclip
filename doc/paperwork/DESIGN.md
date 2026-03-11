# Paperwork — Design Specification

**Codename:** Paperwork
**What:** The hybrid of Paperclip's infrastructure and Open Workshop's methodology
**Fork:** `look-itsaxiom/paperclip` branch `experiment/open-workshop-integration`
**Date:** 2026-03-11

## Vision

Paperwork is Paperclip + Open Workshop's soul. It keeps Paperclip's server, database, web UI, heartbeat scheduler, adapter system, auth, and audit trail. It adds Open Workshop's function-first departments, self-evolving R&D, project lifecycle with ROI tracking, session warm-start, and "work from where you are" CLI philosophy.

The end state: a single system where the web dashboard shows your studio, persistent agents handle recurring work, the CLI plugin lets you work directly, and the whole thing grows its own capabilities through R&D.

## Core Concepts

### Department (NEW — replaces Open Workshop's flat-file departments)

A department is a **capability definition**, not an agent. It defines *what knowledge and tools are needed* for a category of work. Agents are instantiated from departments.

```
Department = knowledge base + tool catalog + department-scoped skills
Agent = Department + Adapter + Task assignment
```

This is the fundamental philosophical shift from upstream Paperclip, where agents are defined by their adapter config and role. In Paperwork, agents are defined by their department — the knowledge they carry.

**Why this matters:** In Paperclip, if you want an "engineering agent" and an "art agent," you create two agents with different names and manually configure their instructions. In Paperwork, you create an Engineering department (knowledge.md, tools.yaml, skills) and an Art department. When work needs doing, the system spawns an agent from the right department template. The department IS the reusable unit, not the agent.

### Self-Evolution (NEW — from Open Workshop's R&D model)

The R&D department is special. It can:
1. Research tools and techniques (WebSearch, WebFetch)
2. Create new departments (write knowledge.md + tools.yaml)
3. Compile findings into skills (findings become auto-triggering procedures)
4. Update existing department knowledge bases

This means the system grows its own capabilities over time without code changes.

### Project Lifecycle (NEW — merges both models)

Paperclip has projects with status and workspaces. Open Workshop has projects with milestones, ROI, context briefings, and active/backlog/archive lifecycle. Paperwork merges them:

- **Milestones** with progress tracking (0-100%) and dependencies
- **Ledger entries** linking work to milestones with progress deltas
- **ROI ratio** = overall_progress / total_spend (computed)
- **Context briefings** written on state transitions for cold-start recovery
- **Active/backlog/archive lifecycle** with active limit enforcement
- **Workspaces** (from Paperclip) for git repo integration

### Session Warm-Start (NEW — from Open Workshop)

Before an agent runs (heartbeat or on-demand), the system pre-loads relevant context:
- Current project status and milestones
- Department knowledge base
- Recent issue comments and activity
- Context briefing if resuming from backlog

This eliminates cold-start overhead — agents don't waste tokens reading state on their first turn.

### "Work From Here" CLI (NEW — from Open Workshop)

The lead (you) works from a Claude Code plugin that talks to the Paperwork API. You can:
- View the dashboard (`/dashboard`)
- Focus on a project (`/focus <project>`)
- Dispatch work to departments (spawns an agent via the API)
- Work directly on code (no dispatch needed for simple tasks)
- Do R&D (creates departments, compiles skills)

The CLI plugin is a thin client. All state lives in the database.

---

## Schema Additions

All new tables follow Paperclip's conventions: company-scoped, UUID primary keys, `createdAt`/`updatedAt` timestamps, kebab-case enum values.

### Table: `departments`

The function-first capability definition.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| slug | TEXT | NO | — | Unique within company (e.g., "engineering") |
| name | TEXT | NO | — | Display name (e.g., "Engineering") |
| description | TEXT | YES | — | What this department does |
| knowledgeMd | TEXT | NO | '' | Knowledge base (Markdown) |
| toolsYaml | TEXT | NO | '' | Tool catalog (YAML text) |
| createdByAgentId | UUID | YES | — | FK → agents (R&D agent that created it) |
| createdByUserId | TEXT | YES | — | User that created it |
| metadata | JSONB | YES | — | Custom metadata |
| createdAt | TIMESTAMP TZ | NO | now() | |
| updatedAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `departments_company_slug_idx` (UNIQUE) on (companyId, slug)

### Table: `department_revisions`

Versioned knowledge base changes (mirrors `agent_config_revisions` pattern).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| departmentId | UUID | NO | — | FK → departments (CASCADE) |
| changedFields | JSONB | NO | [] | Array of field names that changed |
| beforeSnapshot | JSONB | NO | — | State before change |
| afterSnapshot | JSONB | NO | — | State after change |
| changedByAgentId | UUID | YES | — | FK → agents |
| changedByUserId | TEXT | YES | — | |
| createdAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `dept_revisions_company_dept_created_idx` on (companyId, departmentId, createdAt)

### Table: `department_skills`

Skills scoped to a department. Injected into agents spawned from this department.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| departmentId | UUID | YES | — | FK → departments (NULL = global skill) |
| slug | TEXT | NO | — | Skill identifier (e.g., "generate-game-art") |
| name | TEXT | NO | — | Display name |
| description | TEXT | NO | — | Trigger description (semantic routing) |
| contentMd | TEXT | NO | — | Full SKILL.md body |
| sourceType | TEXT | NO | 'manual' | 'manual' \| 'compiled' \| 'builtin' |
| sourceFindingId | UUID | YES | — | FK → findings (if compiled) |
| createdAt | TIMESTAMP TZ | NO | now() | |
| updatedAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `dept_skills_company_dept_slug_idx` (UNIQUE) on (companyId, departmentId, slug)
- `dept_skills_company_slug_idx` on (companyId, slug)

### Table: `findings`

R&D research findings that can be compiled into skills.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| departmentId | UUID | YES | — | FK → departments (which dept produced this) |
| title | TEXT | NO | — | Finding title |
| slug | TEXT | NO | — | URL-safe identifier |
| contentMd | TEXT | NO | — | Full finding content (Markdown) |
| compiledSkillId | UUID | YES | — | FK → department_skills (if compiled) |
| createdByAgentId | UUID | YES | — | |
| createdByUserId | TEXT | YES | — | |
| createdAt | TIMESTAMP TZ | NO | now() | |
| updatedAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `findings_company_slug_idx` (UNIQUE) on (companyId, slug)
- `findings_company_dept_idx` on (companyId, departmentId)

### Table: `milestones`

Project milestones with progress tracking.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| projectId | UUID | NO | — | FK → projects |
| name | TEXT | NO | — | Milestone name |
| description | TEXT | YES | — | |
| progress | INTEGER | NO | 0 | 0-100 |
| status | TEXT | NO | 'pending' | 'pending' \| 'active' \| 'done' |
| dependsOn | JSONB | YES | — | Array of milestone IDs |
| gate | TEXT | YES | — | Success criteria |
| sortOrder | INTEGER | NO | 0 | Display ordering |
| createdAt | TIMESTAMP TZ | NO | now() | |
| updatedAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `milestones_company_project_idx` on (companyId, projectId)

### Table: `ledger_entries`

Work log entries linking effort to milestones and cost.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| projectId | UUID | NO | — | FK → projects |
| departmentId | UUID | YES | — | FK → departments |
| agentId | UUID | YES | — | FK → agents (who did the work) |
| issueId | UUID | YES | — | FK → issues (linked task) |
| runId | UUID | YES | — | FK → heartbeat_runs |
| entryType | TEXT | NO | — | 'feature' \| 'bugfix' \| 'design' \| 'research' \| 'art-generation' \| 'content' \| 'baseline' |
| description | TEXT | NO | — | What was done |
| progressDelta | INTEGER | NO | 0 | Percentage points of progress |
| milestoneImpacts | JSONB | YES | — | [{milestoneId, progressBefore, progressAfter}] |
| filesChanged | JSONB | YES | — | Array of file paths |
| estimatedCostUsd | DECIMAL | YES | — | Estimated cost |
| engineUsed | TEXT | YES | — | 'claude' \| 'codex' \| 'gemini' \| etc. |
| notes | TEXT | YES | — | Implementation notes |
| occurredAt | TIMESTAMP TZ | NO | now() | When the work happened |
| createdAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `ledger_entries_company_project_idx` on (companyId, projectId)
- `ledger_entries_company_occurred_idx` on (companyId, occurredAt)

### Table: `project_context_briefings`

Forward-looking context documents written on state transitions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | NO | random() | Primary key |
| companyId | UUID | NO | — | FK → companies |
| projectId | UUID | NO | — | FK → projects |
| triggerEvent | TEXT | NO | — | 'cooled' \| 'reheated' \| 'archived' \| 'milestone_completed' \| 'manual' |
| contentMd | TEXT | NO | — | Briefing content |
| createdByAgentId | UUID | YES | — | |
| createdByUserId | TEXT | YES | — | |
| createdAt | TIMESTAMP TZ | NO | now() | |

Indexes:
- `project_briefings_company_project_idx` on (companyId, projectId, createdAt)

### Column additions to existing `projects` table

| Column | Type | Notes |
|--------|------|-------|
| statusMd | TEXT | Free-form project status narrative (Open Workshop's status.md) |
| lifecycleState | TEXT | 'active' \| 'backlog' \| 'archived' (distinct from existing `status`) |
| activeProjectOrder | INTEGER | Sort order within active projects |
| overallProgress | INTEGER | Computed from milestones (0-100) |
| totalSpendCents | INTEGER | Rolled up from ledger + cost_events |
| roiRatio | DECIMAL | overallProgress / totalSpendCents (computed) |
| techStack | JSONB | Technology stack metadata |
| keyPaths | JSONB | Important file paths in the repo |
| lastBriefingAt | TIMESTAMP TZ | When last briefing was written |

### Column additions to existing `agents` table

| Column | Type | Notes |
|--------|------|-------|
| departmentId | UUID | FK → departments (template this agent was spawned from) |
| isEphemeral | BOOLEAN | true = spawned for one task, cleaned up after; false = persistent |

### New enums to add to `constants.ts`

```typescript
export const DEPARTMENT_SLUGS = ["engineering", "art-design", "game-development", "research-and-development", "game-design", "devops", "qa"] as const;
// Not enforced — departments can have any slug. These are just common defaults.

export const LIFECYCLE_STATES = ["active", "backlog", "archived"] as const;

export const LEDGER_ENTRY_TYPES = ["baseline", "feature", "bugfix", "design", "research", "art-generation", "content"] as const;

export const SKILL_SOURCE_TYPES = ["manual", "compiled", "builtin"] as const;

export const BRIEFING_TRIGGERS = ["cooled", "reheated", "archived", "milestone_completed", "manual"] as const;
```

---

## API Routes

New routes under `/api`, following Paperclip's existing patterns.

### Departments

```
GET    /api/companies/:companyId/departments          — list all departments
POST   /api/companies/:companyId/departments          — create department
GET    /api/companies/:companyId/departments/:id       — get department
PATCH  /api/companies/:companyId/departments/:id       — update (creates revision)
DELETE /api/companies/:companyId/departments/:id       — delete department
GET    /api/companies/:companyId/departments/:id/revisions — revision history
POST   /api/companies/:companyId/departments/:id/revisions/:revId/rollback — rollback
```

### Department Skills

```
GET    /api/companies/:companyId/skills               — list all skills (global + department)
POST   /api/companies/:companyId/skills               — create skill
GET    /api/companies/:companyId/skills/:id            — get skill
PATCH  /api/companies/:companyId/skills/:id            — update skill
DELETE /api/companies/:companyId/skills/:id            — delete skill
POST   /api/companies/:companyId/skills/compile        — compile findings into skills
```

### Findings

```
GET    /api/companies/:companyId/findings              — list findings
POST   /api/companies/:companyId/findings              — create finding
GET    /api/companies/:companyId/findings/:id           — get finding
PATCH  /api/companies/:companyId/findings/:id           — update finding
DELETE /api/companies/:companyId/findings/:id           — delete finding
```

### Milestones

```
GET    /api/companies/:companyId/projects/:projectId/milestones      — list milestones
POST   /api/companies/:companyId/projects/:projectId/milestones      — create milestone
PATCH  /api/companies/:companyId/projects/:projectId/milestones/:id  — update milestone
DELETE /api/companies/:companyId/projects/:projectId/milestones/:id  — delete milestone
```

### Ledger

```
GET    /api/companies/:companyId/projects/:projectId/ledger          — list entries
POST   /api/companies/:companyId/projects/:projectId/ledger          — create entry
GET    /api/companies/:companyId/projects/:projectId/ledger/summary   — ROI summary
```

### Project Lifecycle

```
POST   /api/companies/:companyId/projects/:projectId/cool            — active → backlog (auto-generates briefing)
POST   /api/companies/:companyId/projects/:projectId/reheat          — backlog → active
POST   /api/companies/:companyId/projects/:projectId/archive         — → archived (auto-generates briefing)
GET    /api/companies/:companyId/projects/:projectId/briefings       — list briefings
POST   /api/companies/:companyId/projects/:projectId/briefings       — manual briefing
GET    /api/companies/:companyId/projects/:projectId/context         — full context load (for warm-start)
```

### Dashboard (enhanced)

```
GET    /api/companies/:companyId/dashboard             — full studio dashboard
  Response includes:
    - active projects with status, milestones, ROI
    - backlog project names
    - department list
    - recent activity
    - cost summary
```

---

## Skill Injection Changes

Currently all adapters inject every skill from `skills/`. Paperwork changes this:

### Injection logic (per agent run):

1. **Builtin skills** — always injected (the `paperclip` heartbeat procedure, `para-memory-files`)
2. **Global skills** — `department_skills` where `departmentId IS NULL`
3. **Department skills** — `department_skills` where `departmentId = agent.departmentId`
4. **Department knowledge** — `departments.knowledgeMd` prepended to agent system prompt

This means an engineering agent gets engineering skills + global skills + builtin skills. An art agent gets art skills + global skills + builtin skills. No agent gets skills from departments it doesn't belong to.

### Implementation:

The adapter `execute()` context gains a new field:

```typescript
interface AdapterExecutionContext {
  // ... existing fields ...
  department?: {
    slug: string;
    knowledgeMd: string;
    toolsYaml: string;
  };
  skills?: Array<{
    slug: string;
    name: string;
    description: string;
    contentMd: string;
  }>;
}
```

The heartbeat service resolves these from the database before calling `adapter.execute()`.

---

## Session Warm-Start

### Before each agent run, the heartbeat service assembles a context preamble:

```
=== DEPARTMENT: {department.name} ===
{department.knowledgeMd}

=== PROJECT: {project.name} ===
Status: {project.statusMd}
Progress: {overallProgress}%
Spend: ${totalSpendCents / 100}

=== ACTIVE MILESTONES ===
{milestones where status = 'active', formatted as table}

=== LATEST BRIEFING ===
{most recent project_context_briefing, if exists}

=== YOUR ASSIGNMENT ===
Issue: {issue.title}
Description: {issue.description}
Recent comments: {last 5 comments}
```

This is passed as the `prompt` field to the adapter, prepended before the task-specific prompt. The agent starts with full context on turn 1.

---

## CLI Plugin (Thin Client)

The Open Workshop plugin evolves into a Paperwork CLI plugin that talks to `http://localhost:3100/api`. The hook system stays the same — `SessionStart` calls the dashboard API instead of reading YAML files. Skills are fetched from the API.

### SessionStart hook flow:

```
1. GET /api/health → verify server is running
2. GET /api/companies/:companyId/dashboard → get full studio state
3. Inject dashboard as additionalContext
4. If server unreachable → fall back to "server offline" message
```

### Department dispatch:

```
1. User says "dispatch this to engineering"
2. Plugin reads department list from GET /api/companies/:companyId/departments
3. Creates issue: POST /api/companies/:companyId/issues
4. Assigns to department: the server spawns an agent from the department template
5. Agent runs via heartbeat, reports back via issue comments
6. Plugin polls or receives WebSocket update
```

### Direct work mode:

The lead can also work directly without dispatching. In this mode, the plugin functions like current Open Workshop — the human drives Claude Code, uses department knowledge for context, and writes ledger entries to the API when done.

---

## Migration Path

### Phase 0: Schema + API (no behavior changes)
- Add all new tables via Drizzle migration
- Add new columns to projects and agents
- Implement CRUD API routes for departments, skills, findings, milestones, ledger, briefings
- Seed R&D department on company creation

### Phase 1: Department-Based Agent Spawning
- Agent creation accepts `departmentId`
- Heartbeat resolves department context before agent runs
- Skill injection uses department scoping
- Knowledge base prepended to agent system prompt

### Phase 2: Project Lifecycle + ROI
- Implement cool/reheat/archive endpoints with auto-briefing
- Implement ROI computation (milestone progress / spend)
- Enhanced dashboard endpoint with full studio view
- Active project limit enforcement

### Phase 3: Self-Evolution
- R&D department template (agent that can create departments)
- Findings → skills compilation endpoint
- Department knowledge revision tracking
- Skill auto-discovery (description-based semantic routing)

### Phase 4: CLI Plugin
- Rewrite Open Workshop SessionStart hook to call Paperwork API
- Department dispatch via API instead of sub-agents
- Direct work mode with API-backed ledger writes
- WebSocket integration for real-time updates

---

## What We're NOT Changing

- Paperclip's core heartbeat loop
- The adapter system (all 8 adapters stay)
- Auth model (local_trusted + authenticated)
- Company scoping and multi-tenancy
- The existing skills format (SKILL.md with YAML frontmatter)
- Issue/task model (enhanced, not replaced)
- Goal hierarchy (milestones complement, don't replace)
- Agent config revision system
- Cost events table (ledger is additive, not a replacement)
- Activity log
- WebSocket live events
- Company portability (export/import)
