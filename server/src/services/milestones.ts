import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { milestones, projects } from "@paperclipai/db";
import { notFound } from "../errors.js";

export function milestonesService(db: Db) {
  async function computeOverallProgress(companyId: string, projectId: string) {
    const rows = await db
      .select({ progress: milestones.progress })
      .from(milestones)
      .where(and(eq(milestones.companyId, companyId), eq(milestones.projectId, projectId)));

    const avg = rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.progress, 0) / rows.length)
      : 0;

    await db
      .update(projects)
      .set({ overallProgress: avg })
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)));
  }

  return {
    list: (companyId: string, projectId: string) =>
      db
        .select()
        .from(milestones)
        .where(and(eq(milestones.companyId, companyId), eq(milestones.projectId, projectId)))
        .orderBy(asc(milestones.sortOrder)),

    get: (companyId: string, id: string) =>
      db
        .select()
        .from(milestones)
        .where(and(eq(milestones.companyId, companyId), eq(milestones.id, id)))
        .then((rows) => rows[0] ?? null),

    create: async (
      companyId: string,
      data: Omit<typeof milestones.$inferInsert, "companyId">,
    ) => {
      const row = await db
        .insert(milestones)
        .values({ ...data, companyId })
        .returning()
        .then((rows) => rows[0]);

      await computeOverallProgress(companyId, data.projectId);
      return row;
    },

    update: async (
      companyId: string,
      id: string,
      data: Partial<Pick<typeof milestones.$inferInsert, "name" | "description" | "progress" | "status" | "dependsOn" | "gate" | "sortOrder">>,
    ) => {
      const existing = await db
        .select()
        .from(milestones)
        .where(and(eq(milestones.companyId, companyId), eq(milestones.id, id)))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const updated = await db
        .update(milestones)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(milestones.companyId, companyId), eq(milestones.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (updated) {
        await computeOverallProgress(companyId, existing.projectId);
      }
      return updated;
    },

    delete: async (companyId: string, id: string) => {
      const existing = await db
        .select()
        .from(milestones)
        .where(and(eq(milestones.companyId, companyId), eq(milestones.id, id)))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const deleted = await db
        .delete(milestones)
        .where(and(eq(milestones.companyId, companyId), eq(milestones.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (deleted) {
        await computeOverallProgress(companyId, existing.projectId);
      }
      return deleted;
    },

    computeOverallProgress,
  };
}
