CREATE TABLE IF NOT EXISTS "department_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"plugin_type" text NOT NULL,
	"config" jsonb NOT NULL,
	"install_command" text,
	"verify_command" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "department_plugins" ADD CONSTRAINT "department_plugins_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "department_plugins" ADD CONSTRAINT "department_plugins_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "department_plugins" ADD CONSTRAINT "department_plugins_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dept_plugins_company_dept_slug_idx" ON "department_plugins" USING btree ("company_id","department_id","slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dept_plugins_company_dept_idx" ON "department_plugins" USING btree ("company_id","department_id");
