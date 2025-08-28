import { Metadata } from 'next';
import { TemplateDetail } from './client';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Template | ROCQET',
  description: 'View and use this AI prompt template',
};

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TemplateDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  
  // Get current user to pass to client component
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user's workspaces if authenticated
  let workspaces = [];
  if (user) {
    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(id, name, slug)')
      .eq('user_id', user.id);
    
    if (memberData) {
      workspaces = memberData.map(m => m.workspace).filter(Boolean);
    }
  }
  
  return <TemplateDetail 
    templateSlug={slug} 
    initialUser={user}
    initialWorkspaces={workspaces}
  />;
}