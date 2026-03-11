import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { costEvents, ledgerEntries, projects } from "@paperclipai/db";
import { notFound } from "../errors.js";

export function ledgerEntriesService(db: Db) {
  async function recomputeProjectSpend(companyId: string, projectId: string) {
    const [{ ledgerCostUsd }] = await db
      .select({
        ledgerCostUsd: sql<string>`coalesce(sum(${ledgerEntries.estimatedCostUsd}::numeric), 0)`,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.companyId, companyId),
          eq(ledgerEntries.projectId, projectId),
        ),
      );

    const [{ eventCostCents }] = await db
      .select({
        eventCostCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
      })
      .from(costEvents)
      .where(
        and(
          eq(costEvents.companyId, companyId),
          eq(costEvents.projectId, projectId),
        ),
      );

    const ledgerCostCents = Math.round(Number(ledgerCostUsd) * 100);
    const totalSpendCents = ledgerCostCents + Number(eventCostCents);

    const project = await db
      .select({ overallProgress: projects.overallProgress })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.companyId, companyId)),
      )
      .then((rows) => rows[0] ?? null);

    if (!project) throw notFound("Project not found");

    const roiRatio =
      totalSpendCents > 0
        ? (project.overallProgress ?? 0) / (totalSpendCents / 100)
        : null;

    await db
      .update(projects)
      .set({
        totalSpendCents,
        roiRatio: roiRatio !== null ? String(roiRatio) : null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(projects.id, projectId), eq(projects.companyId, companyId)),
      );
  }

  return {
    list: async (
      companyId: string,
      projectId: string,
      options?: { limit?: number; offset?: number },
    ) => {
      const rows = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.companyId, companyId),
            eq(ledgerEntries.projectId, projectId),
          ),
        )
        .orderBy(desc(ledgerEntries.occurredAt))
        .limit(options?.limit ?? 100)
        .offset(options?.offset ?? 0);
      return rows;
    },

    listByCompany: async (
      companyId: string,
      options?: { limit?: number; offset?: number },
    ) => {
      const rows = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.companyId, companyId))
        .orderBy(desc(ledgerEntries.occurredAt))
        .limit(options?.limit ?? 100)
        .offset(options?.offset ?? 0);
      return rows;
    },

    get: async (companyId: string, id: string) => {
      const row = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.companyId, companyId),
            eq(ledgerEntries.id, id),
          ),
        )
        .then((rows) => rows[0] ?? null);
      return row;
    },

    create: async (
      companyId: string,
      data: {
        projectId: string;
        departmentId?: string | null;
        agentId?: string | null;
        issueId?: string | null;
        runId?: string | null;
        entryType: string;
        description: string;
        progressDelta?: number;
        milestoneImpacts?: Array<{
          milestoneId: string;
          progressBefore: number;
          progressAfter: number;
        }>;
        filesChanged?: string[];
        estimatedCostUsd?: string | null;
        engineUsed?: string | null;
        notes?: string | null;
        occurredAt?: Date;
      },
    ) => {
      const entry = await db
        .insert(ledgerEntries)
        .values({
          companyId,
          projectId: data.projectId,
          departmentId: data.departmentId ?? null,
          agentId: data.agentId ?? null,
          issueId: data.issueId ?? null,
          runId: data.runId ?? null,
          entryType: data.entryType,
          description: data.description,
          progressDelta: data.progressDelta ?? 0,
          milestoneImpacts: data.milestoneImpacts ?? null,
          filesChanged: data.filesChanged ?? null,
          estimatedCostUsd: data.estimatedCostUsd ?? null,
          engineUsed: data.engineUsed ?? null,
          notes: data.notes ?? null,
          occurredAt: data.occurredAt ?? new Date(),
        })
        .returning()
        .then((rows) => rows[0]);

      await recomputeProjectSpend(companyId, data.projectId);

      return entry;
    },

    summary: async (companyId: string, projectId: string) => {
      const [{ totalEstimatedCostUsd }] = await db
        .select({
          totalEstimatedCostUsd: sql<string>`coalesce(sum(${ledgerEntries.estimatedCostUsd}::numeric), 0)`,
        })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.companyId, companyId),
            eq(ledgerEntries.projectId, projectId),
          ),
        );

      const [{ totalCostEventsCents }] = await db
        .select({
          totalCostEventsCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.companyId, companyId),
            eq(costEvents.projectId, projectId),
          ),
        );

      const [{ entryCount }] = await db
        .select({
          entryCount: sql<number>`count(*)::int`,
        })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.companyId, companyId),
            eq(ledgerEntries.projectId, projectId),
          ),
        );

      const project = await db
        .select({
          overallProgress: projects.overallProgress,
          roiRatio: projects.roiRatio,
        })
        .from(projects)
        .where(
          and(eq(projects.id, projectId), eq(projects.companyId, companyId)),
        )
        .then((rows) => rows[0] ?? null);

      if (!project) throw notFound("Project not found");

      return {
        totalEstimatedCostUsd: Number(totalEstimatedCostUsd),
        totalCostEventsCents: Number(totalCostEventsCents),
        overallProgress: project.overallProgress ?? 0,
        roiRatio: project.roiRatio ? Number(project.roiRatio) : null,
        entryCount: Number(entryCount),
      };
    },

    recomputeProjectSpend,
  };
}
