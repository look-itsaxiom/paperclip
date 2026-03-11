import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { agentService, departmentsService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function departmentRoutes(db: Db) {
  const router = Router();
  const svc = departmentsService(db);

  function buildActor(req: Parameters<typeof getActorInfo>[0]) {
    const info = getActorInfo(req);
    return info.actorType === "agent"
      ? { agentId: info.actorId }
      : { userId: info.actorId };
  }

  router.get("/companies/:companyId/departments", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await svc.list(companyId, { search });
    res.json(result);
  });

  router.get("/companies/:companyId/departments/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const department = await svc.get(companyId, id);
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    res.json(department);
  });

  router.post("/companies/:companyId/departments", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const department = await svc.create(companyId, req.body, actor);
    res.status(201).json(department);
  });

  router.patch("/companies/:companyId/departments/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const department = await svc.update(companyId, id, req.body, actor);
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    res.json(department);
  });

  router.delete("/companies/:companyId/departments/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const department = await svc.delete(companyId, id);
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }
    res.json(department);
  });

  router.get("/companies/:companyId/departments/:id/revisions", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const revisions = await svc.listRevisions(companyId, id);
    res.json(revisions);
  });

  router.post("/companies/:companyId/departments/:id/rollback", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const department = await svc.rollback(companyId, id, req.body.revisionId, actor);
    res.json(department);
  });

  router.post("/companies/:companyId/departments/:id/spawn-agent", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);

    const department = await svc.get(companyId, id);
    if (!department) {
      res.status(404).json({ error: "Department not found" });
      return;
    }

    const agentSvc = agentService(db);
    const overrides = req.body ?? {};

    const agent = await agentSvc.create(companyId, {
      name: overrides.name ?? department.name,
      role: overrides.role ?? "general",
      title: `${department.name} Specialist`,
      capabilities: department.description ?? undefined,
      departmentId: department.id,
      adapterType: overrides.adapterType ?? "claude_local",
      adapterConfig: overrides.adapterConfig ?? {},
      runtimeConfig: overrides.runtimeConfig ?? {},
      status: "idle",
      spentMonthlyCents: 0,
      lastHeartbeatAt: null,
    });

    res.status(201).json(agent);
  });

  return router;
}
