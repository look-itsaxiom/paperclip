import type { Db } from "@paperclipai/db";
import { departmentsService } from "./departments.js";
import { agentService } from "./agents.js";

export interface AgentTemplate {
  slug: string;
  name: string;
  description: string;
  role: string;
  title: string;
  capabilities: string;
  adapterType: string;
  runtimeConfig: Record<string, unknown>;
  departmentSlug: string;
}

const BUILTIN_TEMPLATES: AgentTemplate[] = [
  {
    slug: "rd-researcher",
    name: "R&D Researcher",
    description:
      "Researches tools, evaluates techniques, and compiles findings into reusable skills.",
    role: "researcher",
    title: "R&D Researcher",
    capabilities:
      "Research tools and techniques, evaluate alternatives, document findings, compile skills from research results. Can create new departments when a new capability area is identified.",
    adapterType: "claude_local",
    runtimeConfig: {},
    departmentSlug: "research-and-development",
  },
  {
    slug: "rd-skill-compiler",
    name: "Skill Compiler",
    description:
      "Reviews findings and compiles them into auto-triggering skills for the workshop.",
    role: "engineer",
    title: "Skill Compiler",
    capabilities:
      "Review research findings, extract actionable patterns, write skill definitions with proper trigger descriptions and disambiguation, update existing skills when new information is available.",
    adapterType: "claude_local",
    runtimeConfig: {},
    departmentSlug: "research-and-development",
  },
];

export function agentTemplatesService(db: Db) {
  const deptSvc = departmentsService(db);
  const agentSvc = agentService(db);

  return {
    /** List all available agent templates */
    list: () => BUILTIN_TEMPLATES,

    /** Get a specific template by slug */
    get: (slug: string) => BUILTIN_TEMPLATES.find((t) => t.slug === slug) ?? null,

    /** Spawn an agent from a template */
    spawn: async (
      companyId: string,
      templateSlug: string,
      overrides?: {
        name?: string;
        adapterType?: string;
        adapterConfig?: Record<string, unknown>;
        runtimeConfig?: Record<string, unknown>;
      },
    ) => {
      const template = BUILTIN_TEMPLATES.find((t) => t.slug === templateSlug);
      if (!template) return null;

      // Find the department
      const dept = await deptSvc.getBySlug(companyId, template.departmentSlug);

      const agent = await agentSvc.create(companyId, {
        name: overrides?.name || template.name,
        role: template.role,
        title: template.title,
        capabilities: template.capabilities,
        adapterType: overrides?.adapterType || template.adapterType,
        adapterConfig: overrides?.adapterConfig || {},
        runtimeConfig: overrides?.runtimeConfig || template.runtimeConfig,
        departmentId: dept?.id,
        isEphemeral: false,
      });

      return { agent, template, department: dept };
    },
  };
}
