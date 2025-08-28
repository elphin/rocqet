export type TierName = 'free' | 'pro' | 'business';

export interface Feature {
  name: string;
  free: boolean | number | string;
  pro: boolean | number | string;
  business: boolean | number | string;
}

export interface Tier {
  name: TierName;
  displayName: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: {
    // Core Features
    prompts: number | 'unlimited';
    versions: number | 'unlimited';
    workspaces: number;
    teamMembers: number | 'unlimited';
    
    // Collaboration
    sharedPrompts: boolean;
    privateFolders: boolean;
    teamCollaboration: boolean;
    guestAccess: boolean;
    
    // AI Features
    aiModels: string[];
    apiKeys: 'own' | 'shared' | 'both';
    testRuns: number | 'unlimited';
    batchTesting: boolean;
    
    // Advanced Features
    analytics: boolean;
    auditLog: boolean;
    customBranding: boolean;
    sso: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    
    // Support
    support: 'community' | 'email' | 'priority';
    sla: boolean;
    training: boolean;
  };
  highlighted?: boolean;
  cta: string;
}

export const SUBSCRIPTION_TIERS: Record<TierName, Tier> = {
  free: {
    name: 'free',
    displayName: 'Free',
    price: {
      monthly: 0,
      yearly: 0
    },
    description: 'Perfect for individuals getting started with prompt management',
    features: {
      prompts: 25,
      versions: 5,
      workspaces: 1,
      teamMembers: 1,
      sharedPrompts: true,
      privateFolders: false,
      teamCollaboration: false,
      guestAccess: false,
      aiModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
      apiKeys: 'own',
      testRuns: 100,
      batchTesting: false,
      analytics: false,
      auditLog: false,
      customBranding: false,
      sso: false,
      apiAccess: false,
      webhooks: false,
      support: 'community',
      sla: false,
      training: false
    },
    cta: 'Start Free'
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    price: {
      monthly: 29,
      yearly: 290 // ~17% discount
    },
    description: 'For professionals and small teams who need more power',
    features: {
      prompts: 'unlimited',
      versions: 'unlimited',
      workspaces: 3,
      teamMembers: 5,
      sharedPrompts: true,
      privateFolders: true,
      teamCollaboration: true,
      guestAccess: true,
      aiModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
      apiKeys: 'both',
      testRuns: 5000,
      batchTesting: true,
      analytics: true,
      auditLog: false,
      customBranding: false,
      sso: false,
      apiAccess: true,
      webhooks: false,
      support: 'email',
      sla: false,
      training: false
    },
    highlighted: true,
    cta: 'Start Pro Trial'
  },
  business: {
    name: 'business',
    displayName: 'Business',
    price: {
      monthly: 99,
      yearly: 990 // ~17% discount
    },
    description: 'For teams and organizations that need enterprise features',
    features: {
      prompts: 'unlimited',
      versions: 'unlimited',
      workspaces: 'unlimited',
      teamMembers: 'unlimited',
      sharedPrompts: true,
      privateFolders: true,
      teamCollaboration: true,
      guestAccess: true,
      aiModels: ['all'],
      apiKeys: 'both',
      testRuns: 'unlimited',
      batchTesting: true,
      analytics: true,
      auditLog: true,
      customBranding: true,
      sso: true,
      apiAccess: true,
      webhooks: true,
      support: 'priority',
      sla: true,
      training: true
    },
    cta: 'Contact Sales'
  }
};

export const FEATURE_DETAILS: Feature[] = [
  {
    name: 'Prompts',
    free: '25',
    pro: 'Unlimited',
    business: 'Unlimited'
  },
  {
    name: 'Version History',
    free: '5 per prompt',
    pro: 'Unlimited',
    business: 'Unlimited'
  },
  {
    name: 'Workspaces',
    free: '1',
    pro: '3',
    business: 'Unlimited'
  },
  {
    name: 'Team Members',
    free: 'Just you',
    pro: 'Up to 5',
    business: 'Unlimited'
  },
  {
    name: 'AI Models',
    free: 'Basic models',
    pro: 'All models',
    business: 'All models + custom'
  },
  {
    name: 'Test Runs',
    free: '100/month',
    pro: '5,000/month',
    business: 'Unlimited'
  },
  {
    name: 'Analytics',
    free: false,
    pro: true,
    business: true
  },
  {
    name: 'Audit Log',
    free: false,
    pro: false,
    business: true
  },
  {
    name: 'SSO/SAML',
    free: false,
    pro: false,
    business: true
  },
  {
    name: 'API Access',
    free: false,
    pro: true,
    business: true
  },
  {
    name: 'Custom Branding',
    free: false,
    pro: false,
    business: true
  },
  {
    name: 'Support',
    free: 'Community',
    pro: 'Email',
    business: 'Priority + SLA'
  }
];

// Helper functions to check feature access
export function canAccessFeature(
  tier: TierName,
  feature: keyof Tier['features'],
  currentUsage?: number
): boolean | { allowed: boolean; limit?: number; current?: number } {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const featureValue = tierConfig.features[feature];
  
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }
  
  if (typeof featureValue === 'number' && currentUsage !== undefined) {
    return {
      allowed: currentUsage < featureValue,
      limit: featureValue,
      current: currentUsage
    };
  }
  
  if (featureValue === 'unlimited') {
    return true;
  }
  
  return true;
}

export function getFeatureLimit(tier: TierName, feature: keyof Tier['features']): number | 'unlimited' | null {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const featureValue = tierConfig.features[feature];
  
  if (typeof featureValue === 'number' || featureValue === 'unlimited') {
    return featureValue;
  }
  
  return null;
}

export function shouldUpgrade(
  currentTier: TierName,
  feature: keyof Tier['features'],
  currentUsage?: number
): { shouldUpgrade: boolean; suggestedTier?: TierName; reason?: string } {
  const access = canAccessFeature(currentTier, feature, currentUsage);
  
  if (typeof access === 'boolean' && !access) {
    // Find the next tier that has this feature
    if (currentTier === 'free' && SUBSCRIPTION_TIERS.pro.features[feature]) {
      return {
        shouldUpgrade: true,
        suggestedTier: 'pro',
        reason: `This feature is available in the Pro plan`
      };
    }
    if (currentTier !== 'business' && SUBSCRIPTION_TIERS.business.features[feature]) {
      return {
        shouldUpgrade: true,
        suggestedTier: 'business',
        reason: `This feature is available in the Business plan`
      };
    }
  }
  
  if (typeof access === 'object' && !access.allowed) {
    // User has hit a limit
    if (currentTier === 'free') {
      return {
        shouldUpgrade: true,
        suggestedTier: 'pro',
        reason: `You've reached the ${feature} limit (${access.current}/${access.limit}). Upgrade to Pro for unlimited access.`
      };
    }
    if (currentTier === 'pro') {
      return {
        shouldUpgrade: true,
        suggestedTier: 'business',
        reason: `You've reached the ${feature} limit (${access.current}/${access.limit}). Upgrade to Business for unlimited access.`
      };
    }
  }
  
  return { shouldUpgrade: false };
}