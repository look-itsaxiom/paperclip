/**
 * Assembles warm-start context for a Claude Code session.
 * Call this at SessionStart to pre-load project context.
 */

import { createPaperworkClient, type PaperworkClientOptions } from "./paperwork-client.js";

export interface WarmStartResult {
  companyId: string;
  dashboard: unknown;
  activeProjects: unknown[];
  departments: unknown[];
}

export async function assembleSessionWarmStart(
  companyId: string,
  options?: PaperworkClientOptions,
): Promise<WarmStartResult | null> {
  try {
    const client = createPaperworkClient(options);
    const [dashboard, projects, departments] = await Promise.all([
      client.getDashboard(companyId),
      client.listProjects(companyId, "active"),
      client.listDepartments(companyId),
    ]);

    return {
      companyId,
      dashboard,
      activeProjects: Array.isArray(projects) ? projects : [],
      departments: Array.isArray(departments) ? departments : [],
    };
  } catch {
    // API not available — graceful degradation
    return null;
  }
}
