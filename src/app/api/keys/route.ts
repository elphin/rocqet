import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';

// Helper function to generate secure API key
function generateApiKey(prefix: string = 'rk_live'): { key: string; hash: string; lastFour: string } {
  const randomPart = randomBytes(32).toString('base64url');
  const key = `${prefix}_${randomPart}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const lastFour = key.slice(-4);
  
  return { key, hash, lastFour };
}

// GET: List all API keys for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Check user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all API keys (excluding the actual key hash for security)
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        description,
        key_prefix,
        last_four,
        scopes,
        allowed_ips,
        allowed_origins,
        rate_limit_per_minute,
        rate_limit_per_hour,
        rate_limit_per_day,
        status,
        expires_at,
        last_used_at,
        created_at,
        created_by
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get usage stats for each key
    const keysWithStats = await Promise.all(keys.map(async (key) => {
      const { data: usage } = await supabase
        .from('api_key_usage')
        .select('id')
        .eq('api_key_id', key.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      return {
        ...key,
        usage_last_24h: usage?.length || 0
      };
    }));

    return NextResponse.json(keysWithStats);

  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      name,
      description,
      scopes = ['read'],
      allowedIps = [],
      allowedOrigins = [],
      rateLimitPerMinute = 60,
      rateLimitPerHour = 1000,
      rateLimitPerDay = 10000,
      expiresIn = null // days until expiration
    } = body;

    // Validate inputs
    if (!workspaceId || !name) {
      return NextResponse.json({ error: 'Workspace ID and name are required' }, { status: 400 });
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check API key limits based on subscription tier
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('subscription_tier')
      .eq('id', workspaceId)
      .single();

    const { count: keyCount } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    // Check limits based on tier
    const limits = {
      starter: 1,
      pro: 5,
      team: -1 // unlimited
    };

    const limit = limits[workspace?.subscription_tier || 'starter'];
    if (limit !== -1 && (keyCount || 0) >= limit) {
      return NextResponse.json({ 
        error: `API key limit reached. Upgrade to create more keys.`,
        limit,
        current: keyCount 
      }, { status: 403 });
    }

    // Generate the API key
    const prefix = workspace?.subscription_tier === 'team' ? 'rk_prod' : 'rk_live';
    const { key, hash, lastFour } = generateApiKey(prefix);

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresIn);
      expiresAt = expDate.toISOString();
    }

    // Create the API key record
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        workspace_id: workspaceId,
        name,
        description,
        key_prefix: prefix,
        key_hash: hash,
        last_four: lastFour,
        scopes,
        allowed_ips: allowedIps,
        allowed_origins: allowedOrigins,
        rate_limit_per_minute: rateLimitPerMinute,
        rate_limit_per_hour: rateLimitPerHour,
        rate_limit_per_day: rateLimitPerDay,
        expires_at: expiresAt,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        action: 'api_key_created',
        entity_type: 'api_key',
        entity_id: apiKey.id,
        metadata: { name, scopes }
      });

    // Return the key only once (it can't be retrieved again)
    return NextResponse.json({
      ...apiKey,
      key, // Include the actual key only on creation
      message: 'Save this key securely. You won\'t be able to see it again.'
    });

  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update API key (revoke, update limits, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { keyId, updates } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    // Get the key to check permissions
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('workspace_id, name')
      .eq('id', keyId)
      .single();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', apiKey.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Handle revocation specially
    if (updates.status === 'revoked') {
      updates.revoked_at = new Date().toISOString();
      updates.revoked_by = user.id;
    }

    // Update the key
    const { data: updated, error } = await supabase
      .from('api_keys')
      .update(updates)
      .eq('id', keyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: apiKey.workspace_id,
        user_id: user.id,
        action: updates.status === 'revoked' ? 'api_key_revoked' : 'api_key_updated',
        entity_type: 'api_key',
        entity_id: keyId,
        metadata: { name: apiKey.name, updates }
      });

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    // Get the key to check permissions
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('workspace_id, name')
      .eq('id', keyId)
      .single();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', apiKey.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the key (cascade will delete usage and rate limit data)
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        workspace_id: apiKey.workspace_id,
        user_id: user.id,
        action: 'api_key_deleted',
        entity_type: 'api_key',
        entity_id: keyId,
        metadata: { name: apiKey.name }
      });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}