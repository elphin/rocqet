'use server';

import { createClient } from '@/lib/supabase/server';
import { chainExecutionEngine } from '@/lib/execution/chain-execution-engine';
import type { ExecutionContext } from '@/lib/execution/chain-execution-engine';

/**
 * Execute a chain with the given initial variables
 */
export async function executeChain(
  chainId: string,
  initialVariables: Record<string, any> = {}
): Promise<{ success: boolean; data?: ExecutionContext; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get chain details
    const { data: chain, error: chainError } = await supabase
      .from('chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (chainError || !chain) {
      return { success: false, error: 'Chain not found' };
    }

    // Verify user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', chain.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return { success: false, error: 'Access denied' };
    }

    // Initialize the execution engine
    await chainExecutionEngine.initialize();

    // Execute the chain
    const result = await chainExecutionEngine.executeChain(
      {
        id: chain.id,
        name: chain.name,
        steps: chain.steps || [],
        workspaceId: chain.workspace_id
      },
      initialVariables,
      user.id
    );

    return { 
      success: true, 
      data: result 
    };

  } catch (error: any) {
    console.error('Chain execution error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to execute chain' 
    };
  }
}

/**
 * Get execution history for a chain
 */
export async function getChainExecutions(
  chainId: string,
  limit: number = 20
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get executions
    const { data: executions, error } = await supabase
      .from('chain_runs')
      .select(`
        *,
        chains (
          name,
          workspace_id
        ),
        users (
          email,
          raw_user_meta_data
        )
      `)
      .eq('chain_id', chainId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    // Verify user has access to the workspace
    if (executions && executions.length > 0) {
      const workspaceId = executions[0].chains?.workspace_id;
      
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return { success: false, error: 'Access denied' };
      }
    }

    return { 
      success: true, 
      data: executions || [] 
    };

  } catch (error: any) {
    console.error('Get executions error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get executions' 
    };
  }
}

/**
 * Get a specific chain execution details
 */
export async function getChainExecution(
  executionId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get execution details
    const { data: execution, error } = await supabase
      .from('chain_runs')
      .select(`
        *,
        chains (
          name,
          workspace_id,
          steps
        )
      `)
      .eq('id', executionId)
      .single();

    if (error || !execution) {
      return { success: false, error: 'Execution not found' };
    }

    // Verify user has access to the workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', execution.chains.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return { success: false, error: 'Access denied' };
    }

    return { 
      success: true, 
      data: execution 
    };

  } catch (error: any) {
    console.error('Get execution error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get execution' 
    };
  }
}

/**
 * Cancel a running chain execution
 */
export async function cancelChainExecution(
  executionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get execution to verify ownership
    const { data: execution } = await supabase
      .from('chain_runs')
      .select('user_id, status')
      .eq('id', executionId)
      .single();

    if (!execution) {
      return { success: false, error: 'Execution not found' };
    }

    // Only the user who started the execution can cancel it
    if (execution.user_id !== user.id) {
      return { success: false, error: 'Access denied' };
    }

    // Only running executions can be cancelled
    if (execution.status !== 'running') {
      return { success: false, error: 'Execution is not running' };
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('chain_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error: 'Cancelled by user'
      })
      .eq('id', executionId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Cancel execution error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to cancel execution' 
    };
  }
}

/**
 * Get real-time execution status
 */
export async function subscribeToExecution(
  executionId: string,
  onUpdate: (execution: any) => void
) {
  const supabase = await createClient();
  
  const channel = supabase
    .channel(`execution:${executionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chain_runs',
        filter: `id=eq.${executionId}`
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}