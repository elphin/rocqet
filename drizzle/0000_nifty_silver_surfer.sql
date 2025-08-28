CREATE TABLE "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"token" varchar(255) NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"invited_by" uuid,
	"invite_accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo_url" text,
	"settings" jsonb DEFAULT '{"defaultModel":"gpt-4","enableVersioning":true,"enableCollaboration":true,"enableAI":true}'::jsonb,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"subscription_status" varchar(50) DEFAULT 'active',
	"subscription_end_date" timestamp,
	"monthly_prompt_limit" integer DEFAULT 1000,
	"monthly_prompt_usage" integer DEFAULT 0,
	"member_limit" integer DEFAULT 5,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"color" varchar(7),
	"icon" varchar(50),
	"position" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"input" jsonb NOT NULL,
	"output" text,
	"model" varchar(100) NOT NULL,
	"parameters" jsonb NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"latency_ms" integer,
	"cost" integer,
	"status" varchar(50) NOT NULL,
	"error" text,
	"rating" integer,
	"feedback" text,
	"executed_by" uuid NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"change_type" varchar(50) NOT NULL,
	"change_message" text,
	"diff" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"folder_id" uuid,
	"position" integer DEFAULT 0,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"model" varchar(100) DEFAULT 'gpt-4',
	"temperature" integer DEFAULT 7,
	"max_tokens" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"is_published" boolean DEFAULT false,
	"published_at" timestamp,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"average_rating" integer,
	"is_shared" boolean DEFAULT false,
	"share_settings" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"avatar_url" text,
	"bio" text,
	"preferences" jsonb DEFAULT '{"theme":"system","defaultModel":"gpt-4","emailNotifications":true,"browserNotifications":false}'::jsonb,
	"api_keys" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	"last_active_at" timestamp,
	"onboarding_completed" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"password_hash" text,
	"expires_at" timestamp with time zone,
	"max_views" integer,
	"current_views" integer DEFAULT 0,
	"allow_copying" boolean DEFAULT true,
	"show_variables" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_accessed_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "share_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folders_workspace_idx" ON "folders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "folders_parent_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "prompt_runs_prompt_idx" ON "prompt_runs" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompt_runs_workspace_idx" ON "prompt_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "prompt_runs_executed_at_idx" ON "prompt_runs" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "prompt_versions_prompt_idx" ON "prompt_versions" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompt_versions_version_idx" ON "prompt_versions" USING btree ("prompt_id","version");--> statement-breakpoint
CREATE INDEX "prompts_workspace_idx" ON "prompts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "prompts_folder_idx" ON "prompts" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "prompts_created_by_idx" ON "prompts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "prompts_workspace_slug_unique" ON "prompts" USING btree ("workspace_id","slug");