import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { agentTemplatesService } from "../services/agent-templates.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { logActivity } from "../services/index.js";

export function agentTemplateRoutes(db: Db) {
  const router = Router();
  const svc = agentTemplatesService(db);

  // List all available templates
  router.get("/agent-templates", (_req, res) => {
    res.json(svc.list());
  });

  // Get a specific template
  router.get("/agent-templates/:slug", (req, res) => {
    const template = svc.get(req.params.slug as string);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    res.json(template);
  });

  // Spawn an agent from a template
  router.post("/companies/:companyId/agent-templates/:slug/spawn", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const slug = req.params.slug as string;

    const result = await svc.spawn(companyId, slug, req.body);
    if (!result) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "agent.spawned_from_template",
      entityType: "agent",
      entityId: result.agent.id,
      details: { templateSlug: slug, departmentId: result.department?.id },
    });

    res.status(201).json(result);
  });

  return router;
}
