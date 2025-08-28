import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  try {
    // First try to find by slug, then by ID for backwards compatibility
    let query = supabase
      .from('prompt_templates')
      .select('*');
    
    // Check if it's a UUID (for backwards compatibility)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    
    if (isUuid) {
      query = query.eq('id', slug);
    } else {
      query = query.eq('slug', slug);
    }
    
    const { data: template, error } = await query.single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get current user to check if they liked this template
    const { data: { user } } = await supabase.auth.getUser();
    let is_liked = false;
    
    if (user) {
      const { data: like } = await supabase
        .from('template_likes')
        .select('id')
        .eq('template_id', template.id)
        .eq('user_id', user.id)
        .single();
      
      is_liked = !!like;
    }

    // Increment view count
    await supabase
      .from('prompt_templates')
      .update({ views_count: (template.views_count || 0) + 1 })
      .eq('id', template.id);

    // Get reviews with user info
    const { data: reviews } = await supabase
      .from('template_reviews')
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data)
      `)
      .eq('template_id', template.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ...template,
      is_liked,
      reviews: reviews || []
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// Handle like/unlike
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const pathname = request.nextUrl.pathname;
  
  if (pathname.endsWith('/like')) {
    try {
      // Get template ID from slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('id')
        .eq(isUuid ? 'id' : 'slug', slug)
        .single();
      
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('template_likes')
        .select('id')
        .eq('template_id', template.id)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('template_likes')
          .delete()
          .eq('id', existingLike.id);
        
        // Update likes count
        await supabase
          .from('prompt_templates')
          .update({ 
            likes_count: supabase.raw('likes_count - 1')
          })
          .eq('id', template.id);
        
        return NextResponse.json({ liked: false });
      } else {
        // Like
        await supabase
          .from('template_likes')
          .insert({
            template_id: template.id,
            user_id: user.id
          });
        
        // Update likes count
        await supabase
          .from('prompt_templates')
          .update({ 
            likes_count: supabase.raw('likes_count + 1')
          })
          .eq('id', template.id);
        
        return NextResponse.json({ liked: true });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return NextResponse.json(
        { error: 'Failed to toggle like' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Invalid endpoint' },
    { status: 400 }
  );
}