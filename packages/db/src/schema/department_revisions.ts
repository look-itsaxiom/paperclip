import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { agents } from "./agents.js";

export const departmentRevisions = pgTable(
  "department_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    changedFields: jsonb("changed_fields").$type<string[]>().notNull().default([]),
    beforeSnapshot: jsonb("before_snapshot").$type<Record<string, unknown>>().notNull(),
    afterSnapshot: jsonb("after_snapshot").$type<Record<string, unknown>>().notNull(),
    changedByAgentId: uuid("changed_by_agent_id").references(() => agents.id),
    changedByUserId: text("changed_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyDeptCreatedIdx: index("dept_revisions_company_dept_created_idx").on(
      table.companyId,
      table.departmentId,
      table.createdAt,
    ),
  }),
);
