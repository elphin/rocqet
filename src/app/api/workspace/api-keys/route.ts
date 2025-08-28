import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt, maskApiKey } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user and workspace
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get workspace from query params
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }
    
    // Check user is member of workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!member) {
      return NextResponse.json({ error: 'Not authorized for this workspace' }, { status: 403 });
    }
    
    // Get API keys for workspace
    const { data: keys, error } = await supabase
      .from('workspace_api_keys')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Return keys without the encrypted values
    const safeKeys = keys?.map(key => ({
      id: key.id,
      name: key.name,
      provider: key.provider,
      masked_key: key.masked_key,
      is_default: key.is_default,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
      created_by: key.created_by
    }));
    
    return NextResponse.json({ data: safeKeys });
    
  } catch (error: any) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { workspace_id, name, provider, api_key, is_default } = body;
    
    if (!workspace_id || !name || !provider || !api_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check user is admin/owner of workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only admins can manage API keys' }, { status: 403 });
    }
    
    // Validate API key format based on provider
    const validateApiKey = (key: string, provider: string): boolean => {
      // Basic validation - must be a non-empty string
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        return false;
      }
      
      switch (provider) {
        case 'openai':
          // OpenAI keys can start with sk- or sk-proj-
          return (key.startsWith('sk-') || key.startsWith('sk-proj-')) && key.length > 20;
        case 'anthropic':
          // Anthropic keys start with sk-ant-
          return key.startsWith('sk-ant-') && key.length > 20;
        case 'google':
          // Google/Gemini API keys are typically 39 characters
          return key.length >= 39;
        case 'cohere':
          // Cohere keys are typically 40 characters
          return key.length >= 40;
        case 'perplexity':
          // Perplexity keys start with pplx-
          return key.startsWith('pplx-') && key.length > 20;
        default:
          // For other providers, just check minimum length
          return key.length >= 10;
      }
    };
    
    if (!validateApiKey(api_key, provider)) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
    }
    
    // Encrypt the API key
    const encryptedKey = await encrypt(api_key);
    const maskedKey = maskApiKey(api_key, provider);
    
    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('workspace_api_keys')
        .update({ is_default: false })
        .eq('workspace_id', workspace_id)
        .eq('provider', provider);
    }
    
    // Insert the new key
    const { data: newKey, error } = await supabase
      .from('workspace_api_keys')
      .insert({
        workspace_id,
        name,
        provider,
        encrypted_key: encryptedKey,
        masked_key: maskedKey,
        is_default: is_default || false,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Return safe version without encrypted key
    const safeKey = {
      id: newKey.id,
      name: newKey.name,
      provider: newKey.provider,
      masked_key: newKey.masked_key,
      is_default: newKey.is_default,
      created_at: newKey.created_at
    };
    
    return NextResponse.json({ data: safeKey });
    
  } catch (error: any) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get key ID from query params
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }
    
    // Get the key to check workspace
    const { data: key } = await supabase
      .from('workspace_api_keys')
      .select('workspace_id')
      .eq('id', keyId)
      .single();
    
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }
    
    // Check user is admin/owner of workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', key.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only admins can manage API keys' }, { status: 403 });
    }
    
    // Delete the key
    const { error } = await supabase
      .from('workspace_api_keys')
      .delete()
      .eq('id', keyId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}