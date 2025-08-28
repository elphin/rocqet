import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationList } from '@/components/notifications/notification-list';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Fetch notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(50);

  // Mark all as read on page view
  if (notifications && notifications.length > 0) {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <a 
            href="/settings/notifications" 
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Notification preferences
          </a>
        </div>

        <div className="bg-card rounded-lg border">
          <NotificationList
            notifications={notifications || []}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}