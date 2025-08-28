import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured') === 'true';
    const authorId = searchParams.get('author_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    // Build query - simplified without joins
    let query = supabase
      .from('prompt_templates')
      .select('*', { count: 'exact' })
      .eq('visibility', 'public');

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    if (featured) {
      query = query.eq('is_featured', true);
    }
    
    if (authorId) {
      query = query.eq('author_id', authorId);
    }
    
    if (search) {
      // Use full-text search
      query = query.textSearch('search_vector', search, { type: 'websearch' });
    }

    // Sorting
    const sortColumn = sortBy === 'popularity' ? 'uses_count' : sortBy;
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) throw error;

    // Add is_liked status for each template if user is logged in
    const templatesWithUserLikes = [];
    for (const template of templates || []) {
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
      
      templatesWithUserLikes.push({
        ...template,
        is_liked
      });
    }

    return NextResponse.json({
      templates: templatesWithUserLikes || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error: any) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      content,
      variables = [],
      category,
      tags = [],
      use_case,
      visibility = 'public',
      recommended_models = [],
      model_settings = {},
      example_input,
      example_output,
      requirements,
      warnings,
      workspace_id
    } = body;

    // Validate required fields
    if (!title || !description || !content || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, content, category' },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    // Get author info
    const { data: userProfile } = await supabase
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', user.id)
      .single();

    const author_name = userProfile?.raw_user_meta_data?.full_name || 
                       userProfile?.raw_user_meta_data?.name || 
                       user.email?.split('@')[0];
    const author_avatar = userProfile?.raw_user_meta_data?.avatar_url;

    // Create template
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .insert({
        title,
        description,
        content,
        variables,
        category,
        tags,
        use_case,
        author_id: user.id,
        author_name,
        author_avatar,
        workspace_id,
        visibility,
        recommended_models,
        model_settings,
        example_input,
        example_output,
        requirements,
        warnings,
        slug,
        version: '1.0.0'
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    if (workspace_id) {
      await supabase.from('activity_logs').insert({
        workspace_id,
        user_id: user.id,
        action: 'template_published',
        entity_type: 'prompt_template',
        entity_id: template.id,
        metadata: { title, category, visibility }
      });
    }

    return NextResponse.json({ template });

  } catch (error: any) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
}