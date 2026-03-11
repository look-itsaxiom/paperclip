import { pgTable, uuid, text, integer, timestamp, date, index, jsonb, numeric } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { goals } from "./goals.js";
import { agents } from "./agents.js";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    goalId: uuid("goal_id").references(() => goals.id),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("backlog"),
    leadAgentId: uuid("lead_agent_id").references(() => agents.id),
    targetDate: date("target_date"),
    color: text("color"),
    executionWorkspacePolicy: jsonb("execution_workspace_policy").$type<Record<string, unknown>>(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    // Paperwork additions
    statusMd: text("status_md"),
    lifecycleState: text("lifecycle_state").default("active"),
    activeProjectOrder: integer("active_project_order"),
    overallProgress: integer("overall_progress").default(0),
    totalSpendCents: integer("total_spend_cents").default(0),
    roiRatio: numeric("roi_ratio"),
    techStack: jsonb("tech_stack").$type<Record<string, string>>(),
    keyPaths: jsonb("key_paths").$type<Record<string, string>>(),
    lastBriefingAt: timestamp("last_briefing_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("projects_company_idx").on(table.companyId),
    companyLifecycleIdx: index("projects_company_lifecycle_idx").on(table.companyId, table.lifecycleState),
  }),
);
