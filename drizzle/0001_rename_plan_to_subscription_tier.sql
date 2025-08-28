-- Rename plan column to subscription_tier
ALTER TABLE "workspaces" RENAME COLUMN "plan" TO "subscription_tier";

-- Update default value
ALTER TABLE "workspaces" ALTER COLUMN "subscription_tier" SET DEFAULT 'starter';

-- Update existing values
UPDATE "workspaces" SET "subscription_tier" = 'starter' WHERE "subscription_tier" = 'free';