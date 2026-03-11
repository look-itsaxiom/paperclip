import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { departmentSkillsService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

export function departmentSkillRoutes(db: Db) {
  const router = Router();
  const svc = departmentSkillsService(db);

  router.get("/companies/:companyId/skills", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const departmentId = typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
    const result = await svc.list(companyId, { departmentId });
    res.json(result);
  });

  router.get("/companies/:companyId/skills/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const skill = await svc.get(companyId, id);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    res.json(skill);
  });

  router.post("/companies/:companyId/skills", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const skill = await svc.create(companyId, req.body);
    res.status(201).json(skill);
  });

  router.patch("/companies/:companyId/skills/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const skill = await svc.update(companyId, id, req.body);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    res.json(skill);
  });

  router.delete("/companies/:companyId/skills/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const skill = await svc.delete(companyId, id);
    if (!skill) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    res.json(skill);
  });

  return router;
}
