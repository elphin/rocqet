-- Function to search through prompt documentation JSONB fields
CREATE OR REPLACE FUNCTION search_prompt_documentation(
  search_query TEXT,
  workspace_uuid UUID,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  name VARCHAR(255),
  slug VARCHAR(255),
  description TEXT,
  content TEXT,
  when_to_use TEXT,
  example_input JSONB,
  example_output JSONB,
  requirements JSONB,
  warnings JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID,
  folder_id UUID,
  version INT,
  uses INT,
  views INT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.workspace_id,
    p.name,
    p.slug,
    p.description,
    p.content,
    p.when_to_use,
    p.example_input,
    p.example_output,
    p.requirements,
    p.warnings,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.folder_id,
    p.version,
    p.uses,
    p.views
  FROM prompts p
  WHERE 
    p.workspace_id = workspace_uuid
    AND p.deleted_at IS NULL
    AND (
      -- Search in text fields
      p.when_to_use ILIKE '%' || search_query || '%'
      OR p.name ILIKE '%' || search_query || '%'
      OR p.description ILIKE '%' || search_query || '%'
      -- Search in JSONB example_input
      OR p.example_input::text ILIKE '%' || search_query || '%'
      -- Search in JSONB example_output  
      OR p.example_output::text ILIKE '%' || search_query || '%'
      -- Search in JSONB arrays (requirements and warnings)
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(p.requirements) AS elem
        WHERE elem ILIKE '%' || search_query || '%'
      )
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(p.warnings) AS elem
        WHERE elem ILIKE '%' || search_query || '%'
      )
    )
  ORDER BY 
    -- Prioritize name matches
    CASE WHEN p.name ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    -- Then description matches
    CASE WHEN p.description ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    -- Then documentation matches
    CASE WHEN p.when_to_use ILIKE '%' || search_query || '%' THEN 0 ELSE 1 END,
    -- Finally by usage
    p.uses DESC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_prompt_documentation TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_documentation_search 
ON prompts USING gin (
  to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(when_to_use, '') || ' ' ||
    COALESCE(content, '')
  )
);

-- Index for JSONB fields
CREATE INDEX IF NOT EXISTS idx_prompts_example_input ON prompts USING gin (example_input);
CREATE INDEX IF NOT EXISTS idx_prompts_example_output ON prompts USING gin (example_output);
CREATE INDEX IF NOT EXISTS idx_prompts_requirements ON prompts USING gin (requirements);
CREATE INDEX IF NOT EXISTS idx_prompts_warnings ON prompts USING gin (warnings);