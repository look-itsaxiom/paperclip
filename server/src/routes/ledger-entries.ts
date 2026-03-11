import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { ledgerEntriesService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

export function ledgerEntryRoutes(db: Db) {
  const router = Router();
  const svc = ledgerEntriesService(db);

  router.get("/companies/:companyId/projects/:projectId/ledger", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const result = await svc.list(companyId, projectId, { limit, offset });
    res.json(result);
  });

  router.get("/companies/:companyId/ledger", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const result = await svc.listByCompany(companyId, { limit, offset });
    res.json(result);
  });

  router.get("/companies/:companyId/ledger/:id", async (req, res) => {
    const companyId = req.params.companyId as string;
    const id = req.params.id as string;
    assertCompanyAccess(req, companyId);
    const entry = await svc.get(companyId, id);
    if (!entry) {
      res.status(404).json({ error: "Ledger entry not found" });
      return;
    }
    res.json(entry);
  });

  router.post("/companies/:companyId/projects/:projectId/ledger", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const entry = await svc.create(companyId, { projectId, ...req.body });
    res.status(201).json(entry);
  });

  router.get("/companies/:companyId/projects/:projectId/ledger/summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    const projectId = req.params.projectId as string;
    assertCompanyAccess(req, companyId);
    const result = await svc.summary(companyId, projectId);
    res.json(result);
  });

  return router;
}
