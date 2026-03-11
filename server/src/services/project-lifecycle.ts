import { and, desc, eq, lt, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  projects,
  projectContextBriefings,
  milestones,
  ledgerEntries,
} from "@paperclipai/db";
import { notFound } from "../errors.js";

interface Actor {
  agentId?: string | null;
  userId?: string | null;
}

interface CreateBriefingData {
  projectId: string;
  triggerEvent: string;
  contentMd: string;
}

export function projectLifecycleService(db: Db) {
  async function ensureProject(companyId: string, projectId: string) {
    const row = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .then((rows) => rows[0] ?? null);
    if (!row) throw notFound("Project not found");
    return row;
  }

  async function insertBriefing(
    companyId: string,
    projectId: string,
    triggerEvent: string,
    contentMd: string,
    actor: Actor,
  ) {
    return db
      .insert(projectContextBriefings)
      .values({
        companyId,
        projectId,
        triggerEvent,
        contentMd,
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.userId ?? null,
      })
      .returning()
      .then((rows) => rows[0]);
  }

  return {
    cool: async (
      companyId: string,
      projectId: string,
      briefingContent: string,
      actor: Actor,
    ) => {
      await ensureProject(companyId, projectId);
      const now = new Date();

      const updated = await db
        .update(projects)
        .set({ lifecycleState: "backlog", lastBriefingAt: now, updatedAt: now })
        .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
        .returning()
        .then((rows) => rows[0]);

      const briefing = await insertBriefing(companyId, projectId, "cooled", briefingContent, actor);

      return { project: updated, briefing };
    },

    reheat: async (
      companyId: string,
      projectId: string,
      actor: Actor,
    ) => {
      const existing = await ensureProject(companyId, projectId);
      const now = new Date();

      const updated = await db
        .update(projects)
        .set({ lifecycleState: "active", lastBriefingAt: now, updatedAt: now })
        .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
        .returning()
        .then((rows) => rows[0]);

      const latestBriefing = await db
        .select()
        .from(projectContextBriefings)
        .where(
          and(
            eq(projectContextBriefings.companyId, companyId),
            eq(projectContextBriefings.projectId, projectId),
          ),
        )
        .orderBy(desc(projectContextBriefings.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      const contentMd = latestBriefing?.contentMd ?? "Project reheated — no prior briefing available.";

      const briefing = await insertBriefing(companyId, projectId, "reheated", contentMd, actor);

      return { project: updated, briefing };
    },

    archive: async (
      companyId: string,
      projectId: string,
      briefingContent: string,
      actor: Actor,
    ) => {
      await ensureProject(companyId, projectId);
      const now = new Date();

      const updated = await db
        .update(projects)
        .set({
          lifecycleState: "archived",
          archivedAt: now,
          lastBriefingAt: now,
          updatedAt: now,
        })
        .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
        .returning()
        .then((rows) => rows[0]);

      const briefing = await insertBriefing(companyId, projectId, "archived", briefingContent, actor);

      return { project: updated, briefing };
    },

    listBriefings: async (companyId: string, projectId: string) =>
      db
        .select()
        .from(projectContextBriefings)
        .where(
          and(
            eq(projectContextBriefings.companyId, companyId),
            eq(projectContextBriefings.projectId, projectId),
          ),
        )
        .orderBy(desc(projectContextBriefings.createdAt)),

    createBriefing: async (companyId: string, data: CreateBriefingData, actor: Actor) => {
      await ensureProject(companyId, data.projectId);

      const now = new Date();
      await db
        .update(projects)
        .set({ lastBriefingAt: now, updatedAt: now })
        .where(and(eq(projects.id, data.projectId), eq(projects.companyId, companyId)));

      return insertBriefing(companyId, data.projectId, data.triggerEvent, data.contentMd, actor);
    },

    getLatestBriefing: async (companyId: string, projectId: string) =>
      db
        .select()
        .from(projectContextBriefings)
        .where(
          and(
            eq(projectContextBriefings.companyId, companyId),
            eq(projectContextBriefings.projectId, projectId),
          ),
        )
        .orderBy(desc(projectContextBriefings.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),

    getProjectContext: async (companyId: string, projectId: string) => {
      const project = await ensureProject(companyId, projectId);

      const latestBriefing = await db
        .select()
        .from(projectContextBriefings)
        .where(
          and(
            eq(projectContextBriefings.companyId, companyId),
            eq(projectContextBriefings.projectId, projectId),
          ),
        )
        .orderBy(desc(projectContextBriefings.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      const activeMilestones = await db
        .select()
        .from(milestones)
        .where(
          and(
            eq(milestones.companyId, companyId),
            eq(milestones.projectId, projectId),
            or(eq(milestones.status, "active"), lt(milestones.progress, 100)),
          ),
        );

      const recentLedgerEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.companyId, companyId),
            eq(ledgerEntries.projectId, projectId),
          ),
        )
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(10);

      return {
        project,
        latestBriefing,
        activeMilestones,
        recentLedgerEntries,
      };
    },
  };
}
