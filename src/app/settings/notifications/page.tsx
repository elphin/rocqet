import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>

        <NotificationPreferences />
      </div>
    </div>
  );
}