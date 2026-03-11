import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { departmentPlugins } from "@paperclipai/db";

interface Actor {
  agentId?: string | null;
  userId?: string | null;
}

interface CreateData {
  slug: string;
  name: string;
  description?: string | null;
  pluginType: string;
  config: Record<string, unknown>;
  installCommand?: string | null;
  verifyCommand?: string | null;
  enabled?: boolean;
}

interface UpdateData {
  name?: string;
  description?: string | null;
  pluginType?: string;
  config?: Record<string, unknown>;
  installCommand?: string | null;
  verifyCommand?: string | null;
  enabled?: boolean;
}

export function departmentPluginsService(db: Db) {
  return {
    list: async (companyId: string, departmentId: string) =>
      db
        .select()
        .from(departmentPlugins)
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.departmentId, departmentId),
          ),
        ),

    listEnabled: async (companyId: string, departmentId: string) =>
      db
        .select()
        .from(departmentPlugins)
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.departmentId, departmentId),
            eq(departmentPlugins.enabled, true),
          ),
        ),

    get: async (companyId: string, id: string) =>
      db
        .select()
        .from(departmentPlugins)
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.id, id),
          ),
        )
        .then((rows) => rows[0] ?? null),

    create: async (companyId: string, departmentId: string, data: CreateData, actor: Actor) =>
      db
        .insert(departmentPlugins)
        .values({
          companyId,
          departmentId,
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          pluginType: data.pluginType,
          config: data.config,
          installCommand: data.installCommand ?? null,
          verifyCommand: data.verifyCommand ?? null,
          enabled: data.enabled ?? true,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        })
        .returning()
        .then((rows) => rows[0]),

    update: async (companyId: string, id: string, data: UpdateData) => {
      const existing = await db
        .select()
        .from(departmentPlugins)
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.id, id),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      return db
        .update(departmentPlugins)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.id, id),
          ),
        )
        .returning()
        .then((rows) => rows[0] ?? null);
    },

    delete: async (companyId: string, id: string) =>
      db
        .delete(departmentPlugins)
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.id, id),
          ),
        )
        .returning()
        .then((rows) => rows[0] ?? null),

    toggle: async (companyId: string, id: string, enabled: boolean) =>
      db
        .update(departmentPlugins)
        .set({ enabled, updatedAt: new Date() })
        .where(
          and(
            eq(departmentPlugins.companyId, companyId),
            eq(departmentPlugins.id, id),
          ),
        )
        .returning()
        .then((rows) => rows[0] ?? null),
  };
}
