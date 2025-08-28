import { redirect } from 'next/navigation';

export default async function WorkspacePage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceSlug } = await params;
  // Redirect to dashboard when accessing workspace root
  redirect(`/${workspaceSlug}/dashboard`);
  return null;
}