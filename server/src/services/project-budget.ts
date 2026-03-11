import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projects } from "@paperclipai/db";

export function projectBudgetService(db: Db) {
  return {
    /**
     * Check if a project has exceeded its budget.
     * Returns the project with spend info, or null if no budget is set.
     */
    checkBudget: async (companyId: string, projectId: string) => {
      const project = await db
        .select({
          id: projects.id,
          totalSpendCents: projects.totalSpendCents,
          overallProgress: projects.overallProgress,
          roiRatio: projects.roiRatio,
        })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
        .then((rows) => rows[0] ?? null);

      return project;
    },
  };
}
