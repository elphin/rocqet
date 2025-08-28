import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// Simple encryption for API keys (in production, use a proper KMS)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// GET: List user's AI provider keys
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's AI keys
    const { data: userKeys, error } = await supabase
      .from('user_ai_keys')
      .select('*')
      .eq('user_id', user.id)
      .order('provider', { ascending: true })
      .order('is_default', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Don't send encrypted keys to frontend, only metadata
    const sanitizedKeys = userKeys?.map(key => ({
      ...key,
      encrypted_key: undefined,
      has_key: true
    }));
    
    // Check if user is admin to show system keys
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    let systemKeys = [];
    if (adminUser?.is_super_admin) {
      const { data: sysKeys } = await supabase
        .from('system_ai_keys')
        .select('*')
        .order('provider');
      
      systemKeys = sysKeys?.map(key => ({
        ...key,
        encrypted_key: undefined,
        has_key: true
      })) || [];
    }
    
    // Get available models
    const { data: models } = await supabase
      .from('ai_models')
      .select('*')
      .eq('is_active', true)
      .order('provider')
      .order('model_name');
    
    return NextResponse.json({
      userKeys: sanitizedKeys,
      systemKeys,
      models: models || [],
      isAdmin: adminUser?.is_super_admin || false
    });
    
  } catch (error: any) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add new AI provider key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { provider, keyName, apiKey, isDefault, isSystemKey } = body;
    
    // Validate inputs
    if (!provider || !keyName || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Encrypt the API key
    const encryptedKey = encrypt(apiKey);
    const keyHint = '...' + apiKey.slice(-4);
    
    if (isSystemKey) {
      // Check if user is admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (!adminUser?.is_super_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      
      // Add system key
      const { data, error } = await supabase
        .from('system_ai_keys')
        .upsert({
          provider,
          encrypted_key: encryptedKey,
          key_hint: keyHint,
          added_by: user.id,
          daily_limit: body.dailyLimit || 10,
          monthly_limit: body.monthlyLimit || 100,
          allowed_models: body.allowedModels || [],
          is_active: true
        }, {
          onConflict: 'provider'
        })
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, type: 'system', data });
      
    } else {
      // If setting as default, unset other defaults for this provider
      if (isDefault) {
        await supabase
          .from('user_ai_keys')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('provider', provider);
      }
      
      // Add user key
      const { data, error } = await supabase
        .from('user_ai_keys')
        .insert({
          user_id: user.id,
          provider,
          key_name: keyName,
          encrypted_key: encryptedKey,
          key_hint: keyHint,
          is_default: isDefault || false,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, type: 'user', data: {
        ...data,
        encrypted_key: undefined
      }});
    }
    
  } catch (error: any) {
    console.error('Error adding AI provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update AI provider key
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { keyId, isDefault, isActive, keyName, isSystemKey } = body;
    
    if (isSystemKey) {
      // Check admin permission
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (!adminUser?.is_super_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      
      const updates: any = {};
      if (isActive !== undefined) updates.is_active = isActive;
      if (body.dailyLimit !== undefined) updates.daily_limit = body.dailyLimit;
      if (body.monthlyLimit !== undefined) updates.monthly_limit = body.monthlyLimit;
      if (body.allowedModels !== undefined) updates.allowed_models = body.allowedModels;
      
      const { error } = await supabase
        .from('system_ai_keys')
        .update(updates)
        .eq('id', keyId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
    } else {
      // Update user key
      const updates: any = {};
      if (keyName !== undefined) updates.key_name = keyName;
      if (isActive !== undefined) updates.is_active = isActive;
      
      // Handle default flag
      if (isDefault !== undefined) {
        if (isDefault) {
          // Get the provider of this key
          const { data: currentKey } = await supabase
            .from('user_ai_keys')
            .select('provider')
            .eq('id', keyId)
            .eq('user_id', user.id)
            .single();
          
          if (currentKey) {
            // Unset other defaults for this provider
            await supabase
              .from('user_ai_keys')
              .update({ is_default: false })
              .eq('user_id', user.id)
              .eq('provider', currentKey.provider)
              .neq('id', keyId);
          }
        }
        updates.is_default = isDefault;
      }
      
      const { error } = await supabase
        .from('user_ai_keys')
        .update(updates)
        .eq('id', keyId)
        .eq('user_id', user.id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error updating AI provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove AI provider key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    const isSystemKey = searchParams.get('system') === 'true';
    
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }
    
    if (isSystemKey) {
      // Check admin permission
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      if (!adminUser?.is_super_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      
      const { error } = await supabase
        .from('system_ai_keys')
        .delete()
        .eq('id', keyId);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
    } else {
      // Delete user key
      const { error } = await supabase
        .from('user_ai_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error deleting AI provider key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}