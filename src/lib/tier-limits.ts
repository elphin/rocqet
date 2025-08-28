/**
 * Tier Limits and Feature Enforcement
 */

export const tierLimits = {
  starter: {
    prompts: 25,
    versions: 5,
    testRuns: 100,
    folders: true,
    subfolders: false,
    privateFolders: false,
    apiAccess: false,
    analytics: false,
    teamFeatures: false,
    advancedAI: false,
    guestUsers: 0,
    workspaces: 1
  },
  pro: {
    prompts: -1, // unlimited
    versions: -1,
    testRuns: 5000,
    folders: true,
    subfolders: true,
    privateFolders: true,
    apiAccess: true,
    analytics: true,
    teamFeatures: false,
    advancedAI: true,
    guestUsers: 1,
    workspaces: 1
  },
  team: {
    prompts: -1,
    versions: -1,
    testRuns: -1,
    folders: true,
    subfolders: true,
    privateFolders: true,
    apiAccess: true,
    analytics: true,
    teamFeatures: true,
    advancedAI: true,
    guestUsers: -1,
    workspaces: -1,
    minSeats: 2,
    pricePerSeat: 20,
    basePrice: 99
  }
} as const;

export type TierName = keyof typeof tierLimits;

/**
 * Check if a user can create more prompts
 */
export async function canCreatePrompt(
  workspaceId: string,
  tier: TierName,
  supabase: any
): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  const limit = tierLimits[tier].prompts;
  
  // Unlimited prompts for pro and team
  if (limit === -1) {
    return { allowed: true };
  }

  // Count current prompts
  const { count } = await supabase
    .from('prompts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('deleted_at', null);

  const currentCount = count || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `You've reached the ${limit} prompt limit for the ${tier} tier. Upgrade to create more prompts.`,
      limit,
      current: currentCount
    };
  }

  return { 
    allowed: true,
    limit,
    current: currentCount
  };
}

/**
 * Check if a user can add more team members
 */
export async function canAddTeamMember(
  workspaceId: string,
  tier: TierName,
  availableSeats: number,
  supabase: any
): Promise<{ allowed: boolean; reason?: string }> {
  // Only team tier can have team members
  if (tier !== 'team') {
    return {
      allowed: false,
      reason: 'Team features are only available in the Team tier.'
    };
  }

  // Count current members
  const { count } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  const currentMembers = count || 0;

  if (currentMembers >= availableSeats) {
    return {
      allowed: false,
      reason: `All ${availableSeats} seats are occupied. Purchase more seats to add team members.`
    };
  }

  return { allowed: true };
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeature(tier: TierName, feature: keyof typeof tierLimits.starter): boolean {
  const tierConfig = tierLimits[tier];
  const value = tierConfig[feature];
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  return false;
}

/**
 * Get AI models available for a tier
 */
export function getAvailableModels(tier: TierName): string[] {
  switch (tier) {
    case 'starter':
      return ['gpt-3.5-turbo', 'claude-3-haiku'];
    case 'pro':
    case 'team':
      return [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo',
        'claude-3-haiku',
        'claude-3-sonnet',
        'claude-3-opus',
        'gemini-pro',
        'llama-3-70b'
      ];
    default:
      return ['gpt-3.5-turbo'];
  }
}

/**
 * Calculate team tier pricing
 */
export function calculateTeamPrice(
  seats: number,
  period: 'monthly' | 'yearly' = 'monthly'
): number {
  const config = tierLimits.team;
  const basePrice = period === 'monthly' ? config.basePrice : config.basePrice * 10;
  const seatPrice = period === 'monthly' ? config.pricePerSeat : config.pricePerSeat * 10;
  
  // First 2 seats included in base price
  const additionalSeats = Math.max(0, seats - 2);
  
  return basePrice + (additionalSeats * seatPrice);
}

/**
 * Validate downgrade eligibility
 */
export async function canDowngrade(
  workspaceId: string,
  currentTier: TierName,
  targetTier: TierName,
  supabase: any
): Promise<{ allowed: boolean; blockers: string[] }> {
  const blockers: string[] = [];

  // Check prompt count
  if (targetTier === 'starter') {
    const { count: promptCount } = await supabase
      .from('prompts')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('deleted_at', null);

    if ((promptCount || 0) > tierLimits.starter.prompts) {
      blockers.push(`You have ${promptCount} prompts. Archive or delete ${promptCount - tierLimits.starter.prompts} prompts to downgrade.`);
    }
  }

  // Check team members
  if (currentTier === 'team' && targetTier !== 'team') {
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if ((memberCount || 0) > 1) {
      blockers.push('Remove all team members before downgrading from Team tier.');
    }
  }

  // Check API keys
  if (targetTier === 'starter' && (currentTier === 'pro' || currentTier === 'team')) {
    const { count: apiKeyCount } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    if ((apiKeyCount || 0) > 0) {
      blockers.push('Revoke all API keys before downgrading to Starter.');
    }
  }

  return {
    allowed: blockers.length === 0,
    blockers
  };
}