import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { projectLifecycleService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function projectLifecycleRoutes(db: Db) {
  const router = Router();
  const svc = projectLifecycleService(db);

  function buildActor(req: Parameters<typeof getActorInfo>[0]) {
    const info = getActorInfo(req);
    return info.actorType === "agent"
      ? { agentId: info.actorId as string | null, userId: null }
      : { agentId: null, userId: info.actorId as string | null };
  }

  router.post("/companies/:companyId/projects/:projectId/cool", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const result = await svc.cool(companyId, projectId, req.body.briefingContent, actor);
    res.json(result);
  });

  router.post("/companies/:companyId/projects/:projectId/reheat", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const result = await svc.reheat(companyId, projectId, actor);
    res.json(result);
  });

  router.post("/companies/:companyId/projects/:projectId/archive", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const result = await svc.archive(companyId, projectId, req.body.briefingContent, actor);
    res.json(result);
  });

  router.get("/companies/:companyId/projects/:projectId/briefings", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.listBriefings(companyId, projectId);
    res.json(result);
  });

  router.post("/companies/:companyId/projects/:projectId/briefings", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const result = await svc.createBriefing(companyId, { projectId, ...req.body }, actor);
    res.status(201).json(result);
  });

  router.get("/companies/:companyId/projects/:projectId/context", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.getProjectContext(companyId, projectId);
    res.json(result);
  });

  return router;
}
