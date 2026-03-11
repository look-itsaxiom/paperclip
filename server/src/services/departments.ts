import { and, desc, eq, ilike } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { departments, departmentRevisions } from "@paperclipai/db";
import { notFound, unprocessable } from "../errors.js";

const REVISION_FIELDS = [
  "name",
  "description",
  "knowledgeMd",
  "toolsYaml",
  "metadata",
] as const;

type RevisionField = (typeof REVISION_FIELDS)[number];
type DepartmentSnapshot = Pick<typeof departments.$inferSelect, RevisionField>;

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildSnapshot(
  row: Pick<typeof departments.$inferSelect, RevisionField>,
): DepartmentSnapshot {
  return {
    name: row.name,
    description: row.description,
    knowledgeMd: row.knowledgeMd,
    toolsYaml: row.toolsYaml,
    metadata: row.metadata ?? null,
  };
}

function diffSnapshot(
  before: DepartmentSnapshot,
  after: DepartmentSnapshot,
): string[] {
  return REVISION_FIELDS.filter((field) => !jsonEqual(before[field], after[field]));
}

interface Actor {
  agentId?: string | null;
  userId?: string | null;
}

interface CreateData {
  slug: string;
  name: string;
  description?: string | null;
  knowledgeMd?: string;
  toolsYaml?: string;
  metadata?: Record<string, unknown> | null;
}

interface UpdateData {
  name?: string;
  description?: string | null;
  knowledgeMd?: string;
  toolsYaml?: string;
  metadata?: Record<string, unknown> | null;
}

interface ListOptions {
  search?: string;
}

export function departmentsService(db: Db) {
  return {
    list: async (companyId: string, options?: ListOptions) => {
      const conditions = [eq(departments.companyId, companyId)];
      if (options?.search) {
        conditions.push(ilike(departments.name, `%${options.search}%`));
      }
      return db.select().from(departments).where(and(...conditions));
    },

    get: async (companyId: string, id: string) =>
      db
        .select()
        .from(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
        .then((rows) => rows[0] ?? null),

    getBySlug: async (companyId: string, slug: string) =>
      db
        .select()
        .from(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.slug, slug)))
        .then((rows) => rows[0] ?? null),

    create: async (companyId: string, data: CreateData, actor: Actor) =>
      db
        .insert(departments)
        .values({
          companyId,
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          knowledgeMd: data.knowledgeMd ?? "",
          toolsYaml: data.toolsYaml ?? "",
          metadata: data.metadata ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning()
        .then((rows) => rows[0]),

    update: async (companyId: string, id: string, data: UpdateData, actor: Actor) => {
      const existing = await db
        .select()
        .from(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const beforeSnapshot = buildSnapshot(existing);

      const updated = await db
        .update(departments)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (updated) {
        const afterSnapshot = buildSnapshot(updated);
        const changedFields = diffSnapshot(beforeSnapshot, afterSnapshot);
        if (changedFields.length > 0) {
          await db.insert(departmentRevisions).values({
            companyId,
            departmentId: id,
            changedFields,
            beforeSnapshot: beforeSnapshot as unknown as Record<string, unknown>,
            afterSnapshot: afterSnapshot as unknown as Record<string, unknown>,
            changedByAgentId: actor.agentId ?? null,
            changedByUserId: actor.userId ?? null,
          });
        }
      }

      return updated;
    },

    delete: async (companyId: string, id: string) =>
      db
        .delete(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.id, id)))
        .returning()
        .then((rows) => rows[0] ?? null),

    listRevisions: async (companyId: string, departmentId: string) =>
      db
        .select()
        .from(departmentRevisions)
        .where(
          and(
            eq(departmentRevisions.companyId, companyId),
            eq(departmentRevisions.departmentId, departmentId),
          ),
        )
        .orderBy(desc(departmentRevisions.createdAt)),

    rollback: async (
      companyId: string,
      departmentId: string,
      revisionId: string,
      actor: Actor,
    ) => {
      const revision = await db
        .select()
        .from(departmentRevisions)
        .where(
          and(
            eq(departmentRevisions.companyId, companyId),
            eq(departmentRevisions.departmentId, departmentId),
            eq(departmentRevisions.id, revisionId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!revision) throw notFound("Revision not found");

      const snapshot = revision.beforeSnapshot;
      if (typeof snapshot !== "object" || snapshot === null) {
        throw unprocessable("Invalid revision snapshot");
      }

      const existing = await db
        .select()
        .from(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.id, departmentId)))
        .then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Department not found");

      const beforeSnapshot = buildSnapshot(existing);

      const patch: Partial<typeof departments.$inferInsert> = {
        name: typeof snapshot.name === "string" ? snapshot.name : existing.name,
        description:
          typeof snapshot.description === "string" || snapshot.description === null
            ? snapshot.description
            : existing.description,
        knowledgeMd:
          typeof snapshot.knowledgeMd === "string" ? snapshot.knowledgeMd : existing.knowledgeMd,
        toolsYaml:
          typeof snapshot.toolsYaml === "string" ? snapshot.toolsYaml : existing.toolsYaml,
        metadata:
          typeof snapshot.metadata === "object" || snapshot.metadata === null
            ? (snapshot.metadata as Record<string, unknown> | null)
            : existing.metadata,
      };

      const updated = await db
        .update(departments)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(departments.companyId, companyId), eq(departments.id, departmentId)))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (updated) {
        const afterSnapshot = buildSnapshot(updated);
        const changedFields = diffSnapshot(beforeSnapshot, afterSnapshot);
        if (changedFields.length > 0) {
          await db.insert(departmentRevisions).values({
            companyId,
            departmentId,
            changedFields,
            beforeSnapshot: beforeSnapshot as unknown as Record<string, unknown>,
            afterSnapshot: afterSnapshot as unknown as Record<string, unknown>,
            changedByAgentId: actor.agentId ?? null,
            changedByUserId: actor.userId ?? null,
          });
        }
      }

      return updated;
    },
  };
}
