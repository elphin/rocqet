import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get all active categories
    const { data: categories, error } = await supabase
      .from('template_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Get template counts per category
    const formattedCategories = [];
    for (const cat of categories || []) {
      const { count } = await supabase
        .from('prompt_templates')
        .select('*', { count: 'exact', head: true })
        .eq('category', cat.slug);
      
      formattedCategories.push({
        ...cat,
        template_count: count || 0
      });
    }

    return NextResponse.json({ categories: formattedCategories || [] });

  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error.message },
      { status: 500 }
    );
  }
}