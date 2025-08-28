'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RealtimeConfig {
  table: string;
  filter?: {
    column: string;
    value: string;
  };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export function useRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`table-${config.table}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: config.table,
          filter: config.filter ? `${config.filter.column}=eq.${config.filter.value}` : undefined
        },
        (payload) => {
          console.log('Realtime INSERT:', payload);
          if (config.onInsert) {
            config.onInsert(payload.new);
            toast.success('New update received', {
              description: `A new ${config.table.slice(0, -1)} was added`
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: config.table,
          filter: config.filter ? `${config.filter.column}=eq.${config.filter.value}` : undefined
        },
        (payload) => {
          console.log('Realtime UPDATE:', payload);
          if (config.onUpdate) {
            config.onUpdate(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: config.table,
          filter: config.filter ? `${config.filter.column}=eq.${config.filter.value}` : undefined
        },
        (payload) => {
          console.log('Realtime DELETE:', payload);
          if (config.onDelete) {
            config.onDelete(payload.old);
            toast.info('Item removed', {
              description: `A ${config.table.slice(0, -1)} was deleted`
            });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${config.table} realtime changes`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config.table, config.filter?.column, config.filter?.value, supabase]);

  return { isConnected };
}

export function useRealtimePrompts(workspaceId: string) {
  const [prompts, setPrompts] = useState<any[]>([]);
  
  const { isConnected } = useRealtime({
    table: 'prompts',
    filter: {
      column: 'workspace_id',
      value: workspaceId
    },
    onInsert: (newPrompt) => {
      setPrompts(prev => [newPrompt, ...prev]);
    },
    onUpdate: (updatedPrompt) => {
      setPrompts(prev => prev.map(p => 
        p.id === updatedPrompt.id ? updatedPrompt : p
      ));
    },
    onDelete: (deletedPrompt) => {
      setPrompts(prev => prev.filter(p => p.id !== deletedPrompt.id));
    }
  });

  return { prompts, isConnected, setPrompts };
}