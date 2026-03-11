import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { milestonesService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

export function milestoneRoutes(db: Db) {
  const router = Router();
  const svc = milestonesService(db);

  router.get("/companies/:companyId/projects/:projectId/milestones", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.list(companyId, projectId);
    res.json(result);
  });

  router.get("/companies/:companyId/milestones/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const milestone = await svc.get(companyId, id);
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }
    res.json(milestone);
  });

  router.post("/companies/:companyId/projects/:projectId/milestones", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const milestone = await svc.create(companyId, { projectId, ...req.body });
    res.status(201).json(milestone);
  });

  router.patch("/companies/:companyId/milestones/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const milestone = await svc.update(companyId, id, req.body);
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }
    res.json(milestone);
  });

  router.delete("/companies/:companyId/milestones/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const milestone = await svc.delete(companyId, id);
    if (!milestone) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }
    res.json(milestone);
  });

  return router;
}
