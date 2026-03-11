/**
 * Lightweight Paperwork API client for CLI integrations.
 * Designed to be imported by Claude Code hooks or scripts.
 */

const DEFAULT_BASE_URL = "http://localhost:3100/api";

export interface PaperworkClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export function createPaperworkClient(options?: PaperworkClientOptions) {
  const baseUrl = options?.baseUrl || process.env.PAPERWORK_API_URL || DEFAULT_BASE_URL;
  const apiKey = options?.apiKey || process.env.PAPERWORK_API_KEY || "";

  async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Paperwork API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    /** Raw request method for custom endpoints */
    request,

    // Dashboard
    getDashboard: (companyId: string) =>
      request(`/companies/${companyId}/dashboard`),

    // Departments
    listDepartments: (companyId: string) =>
      request(`/companies/${companyId}/departments`),

    getDepartment: (companyId: string, idOrSlug: string) =>
      request(`/companies/${companyId}/departments/${idOrSlug}`),

    // Skills
    listSkills: (companyId: string, departmentId?: string) =>
      request(`/companies/${companyId}/skills${departmentId ? `?departmentId=${departmentId}` : ""}`),

    // Projects
    listProjects: (companyId: string, lifecycle?: string) =>
      request(`/companies/${companyId}/projects${lifecycle ? `?lifecycle=${lifecycle}` : ""}`),

    getProjectContext: (companyId: string, projectId: string) =>
      request(`/companies/${companyId}/projects/${projectId}/context`),

    // Lifecycle
    coolProject: (companyId: string, projectId: string, briefingContent: string) =>
      request(`/companies/${companyId}/projects/${projectId}/cool`, {
        method: "POST",
        body: JSON.stringify({ briefingContent }),
      }),

    reheatProject: (companyId: string, projectId: string) =>
      request(`/companies/${companyId}/projects/${projectId}/reheat`, {
        method: "POST",
      }),

    // Findings
    createFinding: (companyId: string, data: { departmentId?: string; title: string; slug: string; contentMd: string }) =>
      request(`/companies/${companyId}/findings`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    compileFinding: (companyId: string, findingId: string, options?: Record<string, unknown>) =>
      request(`/companies/${companyId}/findings/${findingId}/compile`, {
        method: "POST",
        body: JSON.stringify(options || {}),
      }),

    // Ledger
    createLedgerEntry: (companyId: string, projectId: string, data: Record<string, unknown>) =>
      request(`/companies/${companyId}/projects/${projectId}/ledger`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    // Milestones
    listMilestones: (companyId: string, projectId: string) =>
      request(`/companies/${companyId}/projects/${projectId}/milestones`),

    updateMilestone: (companyId: string, milestoneId: string, data: Record<string, unknown>) =>
      request(`/companies/${companyId}/milestones/${milestoneId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    // Department Plugins
    listDepartmentPlugins: (companyId: string, departmentId: string) =>
      request(`/companies/${companyId}/departments/${departmentId}/plugins`),

    createDepartmentPlugin: (companyId: string, departmentId: string, data: Record<string, unknown>) =>
      request(`/companies/${companyId}/departments/${departmentId}/plugins`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateDepartmentPlugin: (companyId: string, pluginId: string, departmentId: string, data: Record<string, unknown>) =>
      request(`/companies/${companyId}/departments/${departmentId}/plugins/${pluginId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    toggleDepartmentPlugin: (companyId: string, pluginId: string, departmentId: string, enabled: boolean) =>
      request(`/companies/${companyId}/departments/${departmentId}/plugins/${pluginId}/toggle`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),

    deleteDepartmentPlugin: (companyId: string, pluginId: string, departmentId: string) =>
      request(`/companies/${companyId}/departments/${departmentId}/plugins/${pluginId}`, {
        method: "DELETE",
      }),
  };
}
