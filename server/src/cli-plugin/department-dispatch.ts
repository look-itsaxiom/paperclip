/**
 * Dispatch work to a department via the Paperwork API.
 * Used by CLI plugins to delegate tasks to department specialists.
 */

import { createPaperworkClient, type PaperworkClientOptions } from "./paperwork-client.js";

export interface DispatchOptions {
  /** Company ID */
  companyId: string;
  /** Department slug (e.g., "research-and-development", "engineering") */
  departmentSlug: string;
  /** The task/prompt to send to the department agent */
  prompt: string;
  /** Optional project ID to associate the work with */
  projectId?: string;
  /** Optional issue ID to assign */
  issueId?: string;
  /** Optional: prefer an existing agent by name */
  preferAgentName?: string;
  /** Optional: adapter type for new agents (defaults to claude_local) */
  adapterType?: string;
  /** Optional: adapter config overrides */
  adapterConfig?: Record<string, unknown>;
}

export interface DispatchResult {
  success: boolean;
  agentId: string;
  agentName: string;
  departmentId: string;
  /** Whether a new agent was spawned or an existing one was reused */
  action: "spawned" | "reused";
  /** The wakeup was requested */
  wakeupRequested: boolean;
  error?: string;
}

export async function dispatchToDepartment(
  options: DispatchOptions,
  clientOptions?: PaperworkClientOptions,
): Promise<DispatchResult> {
  const client = createPaperworkClient(clientOptions);
  const { companyId, departmentSlug, prompt } = options;

  // 1. Get the department
  const departments = await client.listDepartments(companyId) as Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  const department = departments.find((d) => d.slug === departmentSlug);
  if (!department) {
    return {
      success: false,
      agentId: "",
      agentName: "",
      departmentId: "",
      action: "reused",
      wakeupRequested: false,
      error: `Department "${departmentSlug}" not found`,
    };
  }

  // 2. Spawn an agent in the department (the endpoint handles creation)
  let agentId: string;
  let agentName: string;
  let action: "spawned" | "reused" = "spawned";

  try {
    const spawnResult = await client.request<{
      id: string;
      name: string;
    }>(`/companies/${companyId}/departments/${department.id}/spawn-agent`, {
      method: "POST",
      body: JSON.stringify({
        name: options.preferAgentName || `${department.name} Agent`,
        adapterType: options.adapterType || "claude_local",
        adapterConfig: options.adapterConfig || {},
      }),
    });
    agentId = spawnResult.id;
    agentName = spawnResult.name;
  } catch {
    return {
      success: false,
      agentId: "",
      agentName: "",
      departmentId: department.id,
      action: "reused",
      wakeupRequested: false,
      error: `Failed to spawn or find agent in department "${departmentSlug}"`,
    };
  }

  // 3. Create a wakeup request for the agent
  let wakeupRequested = false;
  try {
    await client.request(`/agents/${agentId}/wakeup`, {
      method: "POST",
      body: JSON.stringify({
        reason: prompt,
        source: "on_demand",
        triggerDetail: "cli_dispatch",
        payload: {
          ...(options.projectId ? { projectId: options.projectId } : {}),
          ...(options.issueId ? { issueId: options.issueId } : {}),
        },
      }),
    });
    wakeupRequested = true;
  } catch {
    // Agent created but wakeup failed — still partially successful
  }

  return {
    success: true,
    agentId,
    agentName,
    departmentId: department.id,
    action,
    wakeupRequested,
  };
}
