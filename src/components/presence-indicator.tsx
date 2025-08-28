'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface User {
  id: string;
  email: string;
  avatar?: string;
}

interface PresenceIndicatorProps {
  workspaceId: string;
  currentUser: User;
  showAvatars?: boolean;
  maxAvatars?: number;
}

export function PresenceIndicator({ 
  workspaceId, 
  currentUser,
  showAvatars = true,
  maxAvatars = 3
}: PresenceIndicatorProps) {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Create a unique channel for this workspace
    const channel = supabase.channel(`presence:${workspaceId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    // Track user presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .filter((user: any) => user.id !== currentUser.id)
          .slice(0, maxAvatars) as User[];
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: currentUser.id,
            email: currentUser.email,
            avatar: currentUser.avatar,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId, currentUser, supabase, maxAvatars]);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {showAvatars && (
        <div className="flex -space-x-2">
          {onlineUsers.map((user) => (
            <div
              key={user.id}
              className="relative inline-block"
              title={user.email}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-white flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {user.email[0].toUpperCase()}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
            </div>
          ))}
        </div>
      )}
      
      <div className="text-sm text-gray-500">
        {onlineUsers.length === 1 
          ? '1 person online' 
          : `${onlineUsers.length} people online`}
      </div>
    </div>
  );
}

export function PresenceDot({ userId, workspaceId }: { userId: string; workspaceId: string }) {
  const [isOnline, setIsOnline] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`presence:${workspaceId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const userIsOnline = Object.values(state)
          .flat()
          .some((user: any) => user.id === userId);
        setIsOnline(userIsOnline);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, workspaceId, supabase]);

  if (!isOnline) return null;

  return (
    <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
  );
}