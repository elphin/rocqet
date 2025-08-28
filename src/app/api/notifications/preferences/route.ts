import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch notification preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preferences or create default ones
    let { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create defaults
      const { data: newPrefs, error: createError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          email_enabled: true,
          email_invites: true,
          email_mentions: true,
          email_updates: true,
          email_marketing: false,
          email_digest: true,
          email_digest_frequency: 'daily',
          app_invites: true,
          app_mentions: true,
          app_comments: true,
          app_updates: true,
          app_limit_warnings: true,
          app_system: true,
          sound_enabled: true,
          desktop_enabled: false
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating preferences:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      preferences = newPrefs;
    } else if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences });

  } catch (error: any) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PATCH: Update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate digest frequency if provided
    if (updates.email_digest_frequency && 
        !['daily', 'weekly', 'never'].includes(updates.email_digest_frequency)) {
      return NextResponse.json(
        { error: 'Invalid digest frequency' },
        { status: 400 }
      );
    }

    // Update preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ preferences: data });

  } catch (error: any) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    );
  }
}