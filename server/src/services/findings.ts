import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { findings } from "@paperclipai/db";

export function findingsService(db: Db) {
  return {
    list: (companyId: string, options?: { departmentId?: string }) => {
      const conditions = [eq(findings.companyId, companyId)];
      if (options?.departmentId) {
        conditions.push(eq(findings.departmentId, options.departmentId));
      }
      return db.select().from(findings).where(and(...conditions));
    },

    get: (companyId: string, id: string) =>
      db
        .select()
        .from(findings)
        .where(and(eq(findings.companyId, companyId), eq(findings.id, id)))
        .then((rows) => rows[0] ?? null),

    getBySlug: (companyId: string, slug: string) =>
      db
        .select()
        .from(findings)
        .where(and(eq(findings.companyId, companyId), eq(findings.slug, slug)))
        .then((rows) => rows[0] ?? null),

    create: (
      companyId: string,
      data: { departmentId?: string | null; title: string; slug: string; contentMd: string },
      actor: { agentId?: string | null; userId?: string | null },
    ) =>
      db
        .insert(findings)
        .values({
          companyId,
          departmentId: data.departmentId ?? null,
          title: data.title,
          slug: data.slug,
          contentMd: data.contentMd,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning()
        .then((rows) => rows[0]),

    update: (
      companyId: string,
      id: string,
      data: Partial<{
        title: string;
        slug: string;
        contentMd: string;
        departmentId: string | null;
        compiledSkillId: string | null;
      }>,
    ) =>
      db
        .update(findings)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(findings.companyId, companyId), eq(findings.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null),

    delete: (companyId: string, id: string) =>
      db
        .delete(findings)
        .where(and(eq(findings.companyId, companyId), eq(findings.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null),
  };
}
