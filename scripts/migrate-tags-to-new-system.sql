-- Migrate tags from JSONB to separate tags table
-- This script migrates tags stored in the prompts.tags JSONB column
-- to the new normalized tags and prompt_tags tables

DO $$
DECLARE
    prompt_record RECORD;
    tag_record RECORD;
    tag_json JSON;
    tag_name TEXT;
    tag_color TEXT;
    new_tag_id UUID;
BEGIN
    -- Loop through all prompts that have tags
    FOR prompt_record IN 
        SELECT id, workspace_id, tags 
        FROM prompts 
        WHERE tags IS NOT NULL 
        AND tags::text != '[]'
        AND tags::text != 'null'
    LOOP
        -- Process each tag in the JSONB array
        FOR tag_json IN SELECT * FROM json_array_elements(prompt_record.tags::json)
        LOOP
            -- Extract tag properties
            tag_name := LOWER(COALESCE(tag_json->>'name', tag_json->>'label', tag_json::text));
            tag_color := COALESCE(tag_json->>'color', '#3B82F6');
            
            -- Remove quotes if the tag is just a string
            tag_name := TRIM(BOTH '"' FROM tag_name);
            
            -- Skip empty tags
            IF tag_name IS NULL OR tag_name = '' OR tag_name = 'null' THEN
                CONTINUE;
            END IF;
            
            -- Check if tag already exists for this workspace
            SELECT id INTO new_tag_id
            FROM tags
            WHERE workspace_id = prompt_record.workspace_id
            AND name = tag_name;
            
            -- If tag doesn't exist, create it
            IF new_tag_id IS NULL THEN
                INSERT INTO tags (workspace_id, name, color)
                VALUES (prompt_record.workspace_id, tag_name, tag_color)
                ON CONFLICT (workspace_id, name) DO NOTHING
                RETURNING id INTO new_tag_id;
                
                -- If insert didn't return an ID (due to conflict), get the existing tag
                IF new_tag_id IS NULL THEN
                    SELECT id INTO new_tag_id
                    FROM tags
                    WHERE workspace_id = prompt_record.workspace_id
                    AND name = tag_name;
                END IF;
            END IF;
            
            -- Create the prompt-tag relationship if it doesn't exist
            IF new_tag_id IS NOT NULL THEN
                INSERT INTO prompt_tags (prompt_id, tag_id)
                VALUES (prompt_record.id, new_tag_id)
                ON CONFLICT (prompt_id, tag_id) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Tag migration completed successfully';
END $$;

-- Verify the migration
SELECT 
    'Total tags created:' as metric,
    COUNT(*) as count
FROM tags
UNION ALL
SELECT 
    'Total prompt-tag relationships:' as metric,
    COUNT(*) as count
FROM prompt_tags
UNION ALL
SELECT 
    'Workspaces with tags:' as metric,
    COUNT(DISTINCT workspace_id) as count
FROM tags;

-- Show sample of migrated tags
SELECT 
    t.name as tag_name,
    t.color,
    w.name as workspace_name,
    COUNT(pt.id) as usage_count
FROM tags t
JOIN workspaces w ON t.workspace_id = w.id
LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
GROUP BY t.id, t.name, t.color, w.name
ORDER BY usage_count DESC
LIMIT 10;