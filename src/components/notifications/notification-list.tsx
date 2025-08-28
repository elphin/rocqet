'use client';

import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  X, 
  Users, 
  FileText, 
  Link2, 
  AlertCircle,
  CreditCard,
  Settings,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  entity_type?: string;
  metadata?: any;
}

interface NotificationListProps {
  notifications: Notification[];
  loading?: boolean;
  onMarkAsRead?: (ids: string[]) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onDelete,
  onRefresh
}: NotificationListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'invite_received':
      case 'invite_accepted':
      case 'member_joined':
      case 'member_left':
        return <Users className="h-4 w-4" />;
      case 'prompt_shared':
      case 'chain_shared':
        return <FileText className="h-4 w-4" />;
      case 'mention':
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'limit_warning':
      case 'limit_reached':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'subscription_update':
      case 'payment_failed':
        return <CreditCard className="h-4 w-4" />;
      case 'system_announcement':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead([notification.id]);
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
        <p className="text-xs text-muted-foreground mt-1">
          You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer relative group",
              !notification.is_read && "bg-muted/30"
            )}
            onClick={() => handleClick(notification)}
          >
            {/* Unread indicator */}
            {!notification.is_read && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full" />
            )}

            <div className="flex gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                <div className={cn(
                  "p-2 rounded-full",
                  !notification.is_read ? "bg-primary/10" : "bg-muted"
                )}>
                  {getIcon(notification.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm",
                  !notification.is_read && "font-medium"
                )}>
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  {!notification.is_read && onMarkAsRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead([notification.id]);
                      }}
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                      }}
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}