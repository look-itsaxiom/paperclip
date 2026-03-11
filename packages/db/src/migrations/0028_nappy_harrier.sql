CREATE TABLE "department_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"changed_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"before_snapshot" jsonb NOT NULL,
	"after_snapshot" jsonb NOT NULL,
	"changed_by_agent_id" uuid,
	"changed_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"department_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"content_md" text NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_finding_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"knowledge_md" text DEFAULT '' NOT NULL,
	"tools_yaml" text DEFAULT '' NOT NULL,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"department_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"content_md" text NOT NULL,
	"compiled_skill_id" uuid,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"department_id" uuid,
	"agent_id" uuid,
	"issue_id" uuid,
	"run_id" uuid,
	"entry_type" text NOT NULL,
	"description" text NOT NULL,
	"progress_delta" integer DEFAULT 0 NOT NULL,
	"milestone_impacts" jsonb,
	"files_changed" jsonb,
	"estimated_cost_usd" numeric,
	"engine_used" text,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"depends_on" jsonb,
	"gate" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_context_briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"trigger_event" text NOT NULL,
	"content_md" text NOT NULL,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "is_ephemeral" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "status_md" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lifecycle_state" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "active_project_order" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "overall_progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "total_spend_cents" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "roi_ratio" numeric;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tech_stack" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "key_paths" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "last_briefing_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "department_revisions" ADD CONSTRAINT "department_revisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_revisions" ADD CONSTRAINT "department_revisions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_revisions" ADD CONSTRAINT "department_revisions_changed_by_agent_id_agents_id_fk" FOREIGN KEY ("changed_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_skills" ADD CONSTRAINT "department_skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_skills" ADD CONSTRAINT "department_skills_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_run_id_heartbeat_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."heartbeat_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_context_briefings" ADD CONSTRAINT "project_context_briefings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_context_briefings" ADD CONSTRAINT "project_context_briefings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_context_briefings" ADD CONSTRAINT "project_context_briefings_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dept_revisions_company_dept_created_idx" ON "department_revisions" USING btree ("company_id","department_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dept_skills_company_dept_slug_idx" ON "department_skills" USING btree ("company_id","department_id","slug");--> statement-breakpoint
CREATE INDEX "dept_skills_company_slug_idx" ON "department_skills" USING btree ("company_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_company_slug_idx" ON "departments" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "departments_company_idx" ON "departments" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "findings_company_slug_idx" ON "findings" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX "findings_company_dept_idx" ON "findings" USING btree ("company_id","department_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_company_project_idx" ON "ledger_entries" USING btree ("company_id","project_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_company_occurred_idx" ON "ledger_entries" USING btree ("company_id","occurred_at");--> statement-breakpoint
CREATE INDEX "milestones_company_project_idx" ON "milestones" USING btree ("company_id","project_id");--> statement-breakpoint
CREATE INDEX "project_briefings_company_project_idx" ON "project_context_briefings" USING btree ("company_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "agents_company_dept_idx" ON "agents" USING btree ("company_id","department_id");--> statement-breakpoint
CREATE INDEX "projects_company_lifecycle_idx" ON "projects" USING btree ("company_id","lifecycle_state");