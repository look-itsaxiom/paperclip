import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { findings, departmentSkills } from "@paperclipai/db";
import { notFound } from "../errors.js";

export function skillCompilerService(db: Db) {
  return {
    /**
     * Compile a finding into a department skill.
     * If a skill with the same slug already exists in the department, updates it.
     * Sets the finding's compiledSkillId to link them.
     */
    compile: async (
      companyId: string,
      findingId: string,
      options?: {
        skillSlug?: string;
        skillName?: string;
        skillDescription?: string;
        departmentId?: string | null;
      },
    ) => {
      // 1. Load the finding
      const finding = await db
        .select()
        .from(findings)
        .where(and(eq(findings.companyId, companyId), eq(findings.id, findingId)))
        .then((rows) => rows[0] ?? null);
      if (!finding) throw notFound("Finding not found");

      const targetDeptId =
        options?.departmentId !== undefined
          ? options.departmentId
          : finding.departmentId;
      const slug = options?.skillSlug || finding.slug;
      const name = options?.skillName || finding.title;
      const description =
        options?.skillDescription ||
        `Compiled from finding: ${finding.title}`;

      // 2. Check if skill already exists (slug + company, scoped to department)
      const existConditions = [
        eq(departmentSkills.companyId, companyId),
        eq(departmentSkills.slug, slug),
      ];
      if (targetDeptId) {
        existConditions.push(eq(departmentSkills.departmentId, targetDeptId));
      } else {
        existConditions.push(isNull(departmentSkills.departmentId));
      }

      const existingSkill = await db
        .select()
        .from(departmentSkills)
        .where(and(...existConditions))
        .then((rows) => rows[0] ?? null);

      let skill;
      if (existingSkill) {
        // Update existing skill
        [skill] = await db
          .update(departmentSkills)
          .set({
            name,
            description,
            contentMd: finding.contentMd,
            sourceType: "compiled",
            sourceFindingId: finding.id,
            updatedAt: new Date(),
          })
          .where(eq(departmentSkills.id, existingSkill.id))
          .returning();
      } else {
        // Create new skill
        [skill] = await db
          .insert(departmentSkills)
          .values({
            companyId,
            departmentId: targetDeptId,
            slug,
            name,
            description,
            contentMd: finding.contentMd,
            sourceType: "compiled",
            sourceFindingId: finding.id,
          })
          .returning();
      }

      // 3. Link finding to the compiled skill
      await db
        .update(findings)
        .set({ compiledSkillId: skill.id, updatedAt: new Date() })
        .where(eq(findings.id, findingId));

      return { finding, skill, action: existingSkill ? ("updated" as const) : ("created" as const) };
    },

    /**
     * List all findings that haven't been compiled into skills yet.
     */
    listUncompiled: async (companyId: string, departmentId?: string) => {
      const conditions = [eq(findings.companyId, companyId)];
      if (departmentId) {
        conditions.push(eq(findings.departmentId, departmentId));
      }
      const rows = await db
        .select()
        .from(findings)
        .where(and(...conditions));
      return rows.filter((f) => !f.compiledSkillId);
    },
  };
}
