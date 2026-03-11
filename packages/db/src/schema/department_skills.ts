import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { departments } from "./departments.js";

export const departmentSkills = pgTable(
  "department_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    contentMd: text("content_md").notNull(),
    sourceType: text("source_type").notNull().default("manual"),
    sourceFindingId: uuid("source_finding_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyDeptSlugIdx: uniqueIndex("dept_skills_company_dept_slug_idx").on(
      table.companyId,
      table.departmentId,
      table.slug,
    ),
    companySlugIdx: index("dept_skills_company_slug_idx").on(table.companyId, table.slug),
  }),
);
