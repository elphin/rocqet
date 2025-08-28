import os
import sys
from dotenv import load_dotenv
from pathlib import Path
import psycopg2
from urllib.parse import urlparse

# Load environment variables
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env.local")
    sys.exit(1)

# Parse DATABASE_URL
parsed = urlparse(DATABASE_URL)

try:
    # Connect to database
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port,
        database=parsed.path[1:],
        user=parsed.username,
        password=parsed.password,
        sslmode='require'
    )
    
    cur = conn.cursor()
    
    print("Creating share_links table...")
    
    # Create table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS public.share_links (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        prompt_id UUID NOT NULL,
        workspace_id UUID NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT,
        expires_at TIMESTAMP WITH TIME ZONE,
        max_views INTEGER,
        current_views INTEGER DEFAULT 0,
        allow_copying BOOLEAN DEFAULT true,
        show_variables BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        last_accessed_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
    );
    """
    
    cur.execute(create_table_sql)
    
    # Create indexes
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_share_links_slug ON public.share_links(slug);",
        "CREATE INDEX IF NOT EXISTS idx_share_links_prompt_id ON public.share_links(prompt_id);",
        "CREATE INDEX IF NOT EXISTS idx_share_links_is_active ON public.share_links(is_active);"
    ]
    
    for index_sql in indexes:
        cur.execute(index_sql)
    
    # Enable RLS
    cur.execute("ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;")
    
    # Create policies (PostgreSQL doesn't support IF NOT EXISTS for policies)
    policies = [
        ("users_manage_share_links", """
        CREATE POLICY users_manage_share_links
        ON public.share_links FOR ALL 
        USING (true) 
        WITH CHECK (true);
        """),
        ("anyone_view_active_share_links", """
        CREATE POLICY anyone_view_active_share_links
        ON public.share_links FOR SELECT 
        USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));
        """)
    ]
    
    for policy_name, policy_sql in policies:
        try:
            cur.execute(policy_sql)
            print(f"Created policy: {policy_name}")
        except psycopg2.errors.DuplicateObject:
            print(f"Policy {policy_name} already exists, skipping...")
    
    # Commit changes
    conn.commit()
    
    print("SUCCESS: Table share_links created successfully!")
    
    # Test the table
    cur.execute("SELECT COUNT(*) FROM public.share_links;")
    count = cur.fetchone()[0]
    print(f"Table has {count} records")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)