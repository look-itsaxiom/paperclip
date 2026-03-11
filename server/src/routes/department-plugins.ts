import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { departmentPluginsService } from "../services/department-plugins.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function departmentPluginRoutes(db: Db) {
  const router = Router();
  const svc = departmentPluginsService(db);

  function buildActor(req: Parameters<typeof getActorInfo>[0]) {
    const info = getActorInfo(req);
    return info.actorType === "agent"
      ? { agentId: info.actorId }
      : { userId: info.actorId };
  }

  // GET /companies/:companyId/departments/:departmentId/plugins
  router.get("/companies/:companyId/departments/:departmentId/plugins", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const plugins = await svc.list(companyId, req.params.departmentId as string);
    res.json(plugins);
  });

  // POST /companies/:companyId/departments/:departmentId/plugins
  router.post("/companies/:companyId/departments/:departmentId/plugins", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const plugin = await svc.create(
      companyId,
      req.params.departmentId as string,
      req.body,
      actor,
    );
    res.status(201).json(plugin);
  });

  // GET /companies/:companyId/departments/:departmentId/plugins/:id
  router.get("/companies/:companyId/departments/:departmentId/plugins/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const plugin = await svc.get(companyId, req.params.id as string);
    if (!plugin) return res.status(404).json({ error: "Plugin not found" });
    res.json(plugin);
  });

  // PATCH /companies/:companyId/departments/:departmentId/plugins/:id
  router.patch("/companies/:companyId/departments/:departmentId/plugins/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const plugin = await svc.update(companyId, req.params.id as string, req.body);
    if (!plugin) return res.status(404).json({ error: "Plugin not found" });
    res.json(plugin);
  });

  // DELETE /companies/:companyId/departments/:departmentId/plugins/:id
  router.delete("/companies/:companyId/departments/:departmentId/plugins/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const plugin = await svc.delete(companyId, req.params.id as string);
    if (!plugin) return res.status(404).json({ error: "Plugin not found" });
    res.json(plugin);
  });

  // POST /companies/:companyId/departments/:departmentId/plugins/:id/toggle
  router.post("/companies/:companyId/departments/:departmentId/plugins/:id/toggle", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean" });
    const plugin = await svc.toggle(companyId, req.params.id as string, enabled);
    if (!plugin) return res.status(404).json({ error: "Plugin not found" });
    res.json(plugin);
  });

  return router;
}
