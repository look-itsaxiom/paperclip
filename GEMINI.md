# GEMINI.md

## Project Overview

**Paperclip** is an open-source orchestration platform for AI agents to run businesses. It allows users to manage a team of AI agents (like Claude Code, OpenClaw, Gemini, etc.) through an organization chart, assign goals, set budgets, and monitor their work from a centralized dashboard.

- **Main Technologies:** TypeScript, Node.js, React, PostgreSQL (Drizzle ORM), pnpm (monorepo).
- **Architecture:** A monorepo containing a server (API), a UI (React dashboard), a CLI, and shared packages for database and agent adapters.

---

## Architecture & Components

The project is structured as a `pnpm` workspace:

- **`server/`**: Node.js API server (Express). Handles orchestration logic, agent heartbeats, and database interactions.
- **`ui/`**: React-based dashboard for visualizing the organization, tasks, and agent activities.
- **`cli/`**: The `paperclipai` CLI tool for setup, configuration, diagnostics, and basic interaction with the Paperclip instance.
- **`packages/db/`**: Shared database package using **Drizzle ORM**. It handles migrations and provides the database schema.
- **`packages/adapters/`**: Implementation of various agent adapters (e.g., `claude-local`, `gemini-local`, `openclaw-gateway`).
- **`packages/shared/`**: Common types, utilities, and constants shared across the workspace.

---

## Building and Running

### Prerequisites
- Node.js 20+
- pnpm 9.15+

### Key Commands (from root)

- **Install Dependencies:**
  ```bash
  pnpm install
  ```

- **Start Development (Full Dev Mode):**
  Starts both the API server and UI in watch mode.
  ```bash
  pnpm dev
  ```

- **Build Everything:**
  ```bash
  pnpm build
  ```

- **Type Checking:**
  ```bash
  pnpm typecheck
  ```

- **Testing:**
  ```bash
  pnpm test:run   # Unit tests (Vitest)
  pnpm test:e2e   # E2E tests (Playwright)
  ```

- **Database Management:**
  ```bash
  pnpm db:generate  # Generate migrations
  pnpm db:migrate   # Apply migrations
  pnpm db:backup    # Manual backup
  ```

---

## Development Workflow

- **Local Data:** By default, Paperclip uses an embedded PostgreSQL and local storage. Data is stored at `~/.paperclip/`.
- **Automatic Setup:** Running `pnpm dev` or `pnpm paperclipai run` will automatically handle onboarding and diagnostics if it's the first time running.
- **Worktree Isolation:** For parallel development in multiple git worktrees, use `pnpm paperclipai worktree init` to create isolated instances.
- **Lockfile Policy:** `pnpm-lock.yaml` is managed by CI on the `master` branch. **Do not commit lockfile changes in PRs.**

---

## Key Directories

- `cli/src/commands/`: Implementation of CLI subcommands.
- `server/src/`: Server-side logic including API routes, services, and agent orchestration.
- `ui/src/`: React components and hooks for the dashboard.
- `packages/db/src/schema/`: Drizzle schema definitions.
- `packages/adapters/`: Source for all supported agent runtimes.
- `doc/`: Detailed documentation for specific features (e.g., `DEPLOYMENT-MODES.md`, `CLI.md`).

---

## Database & Storage

- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`).
- **Database:** PostgreSQL. Local development uses an embedded instance automatically managed by the server.
- **Storage:** Defaults to local disk storage at `~/.paperclip/instances/default/data/storage`.

---

## CLI Usage

The `paperclipai` CLI is the primary tool for managing your instance.

- **Setup:** `paperclipai onboard`
- **Diagnostics:** `paperclipai doctor`
- **Configuration:** `paperclipai configure --section [llm|database|storage|secrets]`
- **Client Operations:**
  - `paperclipai issue list`
  - `paperclipai agent list`
  - `paperclipai company create`

---

## Testing Strategy

- **Unit/Integration Tests:** Located in `__tests__` directories within packages, run via **Vitest**.
- **E2E Tests:** Located in `tests/e2e/`, run via **Playwright**.
- **Smoke Tests:** Bash scripts in `scripts/smoke/` for validating core flows like agent joins.
