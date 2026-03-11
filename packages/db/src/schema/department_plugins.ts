import { pgTable, uuid, text, timestamp, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { departments } from "./departments.js";
import { agents } from "./agents.js";

export const departmentPlugins = pgTable(
  "department_plugins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    departmentId: uuid("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    pluginType: text("plugin_type").notNull(), // mcp_server, cli_tool, env_binding
    config: jsonb("config").notNull().$type<Record<string, unknown>>(),
    installCommand: text("install_command"),
    verifyCommand: text("verify_command"),
    enabled: boolean("enabled").notNull().default(true),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyDeptSlugIdx: uniqueIndex("dept_plugins_company_dept_slug_idx").on(
      table.companyId,
      table.departmentId,
      table.slug,
    ),
    companyDeptIdx: index("dept_plugins_company_dept_idx").on(table.companyId, table.departmentId),
  }),
);
