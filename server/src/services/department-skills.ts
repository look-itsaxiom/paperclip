import { and, eq, or, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { departmentSkills } from "@paperclipai/db";
import { notFound } from "../errors.js";

export function departmentSkillsService(db: Db) {
  return {
    list: async (companyId: string, options?: { departmentId?: string }) => {
      const conditions = [eq(departmentSkills.companyId, companyId)];
      if (options?.departmentId) {
        conditions.push(
          or(
            eq(departmentSkills.departmentId, options.departmentId),
            isNull(departmentSkills.departmentId),
          )!,
        );
      }
      return db.select().from(departmentSkills).where(and(...conditions));
    },

    get: async (companyId: string, id: string) =>
      db
        .select()
        .from(departmentSkills)
        .where(and(eq(departmentSkills.companyId, companyId), eq(departmentSkills.id, id)))
        .then((rows) => rows[0] ?? null),

    getBySlug: async (companyId: string, slug: string, departmentId?: string) => {
      const conditions = [
        eq(departmentSkills.companyId, companyId),
        eq(departmentSkills.slug, slug),
      ];
      if (departmentId !== undefined) {
        conditions.push(eq(departmentSkills.departmentId, departmentId));
      } else {
        conditions.push(isNull(departmentSkills.departmentId));
      }
      return db
        .select()
        .from(departmentSkills)
        .where(and(...conditions))
        .then((rows) => rows[0] ?? null);
    },

    create: async (
      companyId: string,
      data: {
        departmentId?: string | null;
        slug: string;
        name: string;
        description: string;
        contentMd: string;
        sourceType?: string;
        sourceFindingId?: string | null;
      },
    ) =>
      db
        .insert(departmentSkills)
        .values({ ...data, companyId })
        .returning()
        .then((rows) => rows[0]),

    update: async (
      companyId: string,
      id: string,
      data: Partial<typeof departmentSkills.$inferInsert>,
    ) =>
      db
        .update(departmentSkills)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(departmentSkills.companyId, companyId), eq(departmentSkills.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null),

    delete: async (companyId: string, id: string) =>
      db
        .delete(departmentSkills)
        .where(and(eq(departmentSkills.companyId, companyId), eq(departmentSkills.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null),

    listForAgent: async (companyId: string, departmentId?: string) => {
      const conditions = [eq(departmentSkills.companyId, companyId)];
      if (departmentId) {
        conditions.push(
          or(
            eq(departmentSkills.departmentId, departmentId),
            isNull(departmentSkills.departmentId),
          )!,
        );
      } else {
        conditions.push(isNull(departmentSkills.departmentId));
      }
      const rows = await db
        .select({
          slug: departmentSkills.slug,
          name: departmentSkills.name,
          description: departmentSkills.description,
          contentMd: departmentSkills.contentMd,
        })
        .from(departmentSkills)
        .where(and(...conditions));
      return rows;
    },
  };
}
