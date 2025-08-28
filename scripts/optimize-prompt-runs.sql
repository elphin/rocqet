-- Optimize prompt_runs table for better query performance
-- These indexes improve the comparison feature and run history loading

-- Index for faster run history queries per prompt
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompt_runs' 
    AND indexname = 'idx_prompt_runs_prompt_executed'
  ) THEN
    CREATE INDEX idx_prompt_runs_prompt_executed 
    ON prompt_runs(prompt_id, executed_at DESC);
  END IF;
END $$;

-- Index for user's run history
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompt_runs' 
    AND indexname = 'idx_prompt_runs_user_executed'
  ) THEN
    CREATE INDEX idx_prompt_runs_user_executed 
    ON prompt_runs(executed_by, executed_at DESC);
  END IF;
END $$;

-- Index for workspace run analytics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompt_runs' 
    AND indexname = 'idx_prompt_runs_workspace_executed'
  ) THEN
    CREATE INDEX idx_prompt_runs_workspace_executed 
    ON prompt_runs(workspace_id, executed_at DESC);
  END IF;
END $$;

-- Index for status filtering
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompt_runs' 
    AND indexname = 'idx_prompt_runs_status'
  ) THEN
    CREATE INDEX idx_prompt_runs_status 
    ON prompt_runs(status) 
    WHERE status IN ('success', 'error', 'running');
  END IF;
END $$;

-- Composite index for the comparison feature
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'prompt_runs' 
    AND indexname = 'idx_prompt_runs_comparison'
  ) THEN
    CREATE INDEX idx_prompt_runs_comparison 
    ON prompt_runs(prompt_id, workspace_id, executed_at DESC)
    INCLUDE (model, cost, total_tokens);
  END IF;
END $$;