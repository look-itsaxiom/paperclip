import { pgTable, uuid, text, integer, timestamp, jsonb, numeric, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";
import { departments } from "./departments.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    runId: uuid("run_id").references(() => heartbeatRuns.id, { onDelete: "set null" }),
    entryType: text("entry_type").notNull(),
    description: text("description").notNull(),
    progressDelta: integer("progress_delta").notNull().default(0),
    milestoneImpacts: jsonb("milestone_impacts").$type<
      Array<{ milestoneId: string; progressBefore: number; progressAfter: number }>
    >(),
    filesChanged: jsonb("files_changed").$type<string[]>(),
    estimatedCostUsd: numeric("estimated_cost_usd"),
    engineUsed: text("engine_used"),
    notes: text("notes"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyProjectIdx: index("ledger_entries_company_project_idx").on(
      table.companyId,
      table.projectId,
    ),
    companyOccurredIdx: index("ledger_entries_company_occurred_idx").on(
      table.companyId,
      table.occurredAt,
    ),
  }),
);
