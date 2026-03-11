import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { findingsService, skillCompilerService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function findingRoutes(db: Db) {
  const router = Router();
  const svc = findingsService(db);
  const compiler = skillCompilerService(db);

  function buildActor(req: Parameters<typeof getActorInfo>[0]) {
    const info = getActorInfo(req);
    return info.actorType === "agent"
      ? { agentId: info.actorId as string | null, userId: null }
      : { agentId: null, userId: info.actorId as string | null };
  }

  router.get("/companies/:companyId/findings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const departmentId = typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
    const result = await svc.list(companyId, { departmentId });
    res.json(result);
  });

  router.get("/companies/:companyId/findings/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const finding = await svc.get(companyId, id);
    if (!finding) {
      res.status(404).json({ error: "Finding not found" });
      return;
    }
    res.json(finding);
  });

  router.post("/companies/:companyId/findings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = buildActor(req);
    const finding = await svc.create(companyId, req.body, actor);
    res.status(201).json(finding);
  });

  router.patch("/companies/:companyId/findings/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const finding = await svc.update(companyId, id, req.body);
    if (!finding) {
      res.status(404).json({ error: "Finding not found" });
      return;
    }
    res.json(finding);
  });

  router.post("/companies/:companyId/findings/:id/compile", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const result = await compiler.compile(companyId, id, req.body);
    res.status(201).json(result);
  });

  router.delete("/companies/:companyId/findings/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const finding = await svc.delete(companyId, id);
    if (!finding) {
      res.status(404).json({ error: "Finding not found" });
      return;
    }
    res.json(finding);
  });

  return router;
}
