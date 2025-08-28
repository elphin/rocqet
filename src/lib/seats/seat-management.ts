/**
 * Simple Seat Pool Management System
 * 
 * Concept: Owner buys X seats, can invite up to X people across all their team workspaces
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get available seats for a workspace owner
 */
export async function getAvailableSeats(ownerId: string) {
  const supabase = await createClient();

  // Get the owner's team account (if they have one)
  const { data: account } = await supabase
    .from('accounts')
    .select('total_seats_purchased')
    .eq('owner_id', ownerId)
    .eq('subscription_tier', 'team')
    .single();

  if (!account) {
    return { 
      totalSeats: 0, 
      usedSeats: 0, 
      availableSeats: 0,
      hasTeamSubscription: false 
    };
  }

  // Count all members across all team workspaces owned by this user
  const { data: ownedWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('created_by', ownerId)
    .eq('workspace_type', 'team');

  if (!ownedWorkspaces || ownedWorkspaces.length === 0) {
    return {
      totalSeats: account.total_seats_purchased || 0,
      usedSeats: 0,
      availableSeats: account.total_seats_purchased || 0,
      hasTeamSubscription: true
    };
  }

  const workspaceIds = ownedWorkspaces.map(w => w.id);

  // Count total members across all owned team workspaces
  const { count: usedSeats } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .in('workspace_id', workspaceIds);

  const totalSeats = account.total_seats_purchased || 0;
  const used = usedSeats || 0;

  return {
    totalSeats,
    usedSeats: used,
    availableSeats: Math.max(0, totalSeats - used),
    hasTeamSubscription: true
  };
}

/**
 * Check if owner can invite more members
 */
export async function canInviteMember(workspaceId: string, ownerId: string) {
  const seats = await getAvailableSeats(ownerId);
  
  if (!seats.hasTeamSubscription) {
    return {
      allowed: false,
      reason: 'Team subscription required to invite members',
      availableSeats: 0
    };
  }

  if (seats.availableSeats <= 0) {
    return {
      allowed: false,
      reason: `All ${seats.totalSeats} seats are occupied. Purchase more seats to invite members.`,
      availableSeats: 0
    };
  }

  return {
    allowed: true,
    availableSeats: seats.availableSeats
  };
}

/**
 * Get seat usage breakdown by workspace
 */
export async function getSeatUsageByWorkspace(ownerId: string) {
  const supabase = await createClient();

  // Get all team workspaces owned by this user
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      id,
      name,
      slug,
      workspace_members (
        id,
        user_id,
        role,
        joined_at
      )
    `)
    .eq('created_by', ownerId)
    .eq('workspace_type', 'team');

  if (!workspaces) return [];

  return workspaces.map(workspace => ({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    memberCount: workspace.workspace_members?.length || 0,
    members: workspace.workspace_members || []
  }));
}

/**
 * Purchase additional seats
 */
export async function purchaseAdditionalSeats(
  ownerId: string,
  additionalSeats: number
) {
  const supabase = await createClient();

  // Get current account
  const { data: account } = await supabase
    .from('accounts')
    .select('total_seats_purchased, stripe_subscription_id')
    .eq('owner_id', ownerId)
    .eq('subscription_tier', 'team')
    .single();

  if (!account) {
    throw new Error('No team subscription found');
  }

  const newTotal = (account.total_seats_purchased || 0) + additionalSeats;

  // Update account with new seat count
  const { error } = await supabase
    .from('accounts')
    .update({
      total_seats_purchased: newTotal
    })
    .eq('owner_id', ownerId)
    .eq('subscription_tier', 'team');

  if (error) {
    throw error;
  }

  // Update Stripe subscription quantity
  // This would trigger the Stripe update in real implementation
  
  return {
    previousSeats: account.total_seats_purchased,
    newSeats: newTotal,
    addedSeats: additionalSeats
  };
}

/**
 * Remove seats (only if unused)
 */
export async function removeSeats(
  ownerId: string,
  seatsToRemove: number
) {
  const seats = await getAvailableSeats(ownerId);
  
  if (seatsToRemove > seats.availableSeats) {
    throw new Error(
      `Cannot remove ${seatsToRemove} seats. Only ${seats.availableSeats} seats are unused.`
    );
  }

  const supabase = await createClient();
  const newTotal = seats.totalSeats - seatsToRemove;

  // Minimum 1 seat
  if (newTotal < 1) {
    throw new Error('Must maintain at least 1 seat');
  }

  // Update account
  const { error } = await supabase
    .from('accounts')
    .update({
      total_seats_purchased: newTotal
    })
    .eq('owner_id', ownerId)
    .eq('subscription_tier', 'team');

  if (error) {
    throw error;
  }

  return {
    previousSeats: seats.totalSeats,
    newSeats: newTotal,
    removedSeats: seatsToRemove
  };
}

/**
 * Transfer member between workspaces (within same owner's workspaces)
 */
export async function transferMemberBetweenWorkspaces(
  memberId: string,
  fromWorkspaceId: string,
  toWorkspaceId: string,
  ownerId: string
) {
  const supabase = await createClient();

  // Verify both workspaces belong to the same owner
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, created_by')
    .in('id', [fromWorkspaceId, toWorkspaceId])
    .eq('created_by', ownerId)
    .eq('workspace_type', 'team');

  if (!workspaces || workspaces.length !== 2) {
    throw new Error('Both workspaces must belong to the same owner');
  }

  // Remove from old workspace
  await supabase
    .from('workspace_members')
    .delete()
    .eq('user_id', memberId)
    .eq('workspace_id', fromWorkspaceId);

  // Add to new workspace
  const { error } = await supabase
    .from('workspace_members')
    .insert({
      user_id: memberId,
      workspace_id: toWorkspaceId,
      role: 'editor', // Default role for transferred members
      joined_at: new Date().toISOString()
    });

  if (error) {
    throw error;
  }

  return { success: true };
}