import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get all prompts to check their slugs
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('id, name, slug, workspace_id')
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      total: prompts?.length || 0,
      prompts: prompts || [],
      message: 'Check the slugs below to see if they are correct'
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}