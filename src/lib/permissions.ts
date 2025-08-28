// Role-based permissions system for ROCQET

export type Role = 'viewer' | 'member' | 'admin' | 'owner';

export type Permission = 
  // Prompt permissions
  | 'prompts.view'
  | 'prompts.create'
  | 'prompts.edit'
  | 'prompts.delete'
  | 'prompts.share'
  | 'prompts.test'
  | 'prompts.export'
  
  // Version permissions
  | 'versions.view'
  | 'versions.create'
  | 'versions.restore'
  | 'versions.delete'
  
  // Team permissions
  | 'team.view'
  | 'team.invite'
  | 'team.remove'
  | 'team.manage_roles'
  
  // Workspace permissions
  | 'workspace.view'
  | 'workspace.edit'
  | 'workspace.delete'
  | 'workspace.manage_billing'
  | 'workspace.manage_settings'
  
  // API permissions
  | 'api.view_keys'
  | 'api.create_keys'
  | 'api.delete_keys'
  | 'api.use'
  
  // Analytics permissions
  | 'analytics.view'
  | 'analytics.export'
  
  // Admin permissions
  | 'admin.view_audit_log'
  | 'admin.manage_integrations'
  | 'admin.manage_security';

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  viewer: [
    'prompts.view',
    'prompts.test',
    'versions.view',
    'team.view',
    'workspace.view'
  ],
  
  member: [
    // Inherit all viewer permissions
    'prompts.view',
    'prompts.test',
    'versions.view',
    'team.view',
    'workspace.view',
    // Additional member permissions
    'prompts.create',
    'prompts.edit',
    'prompts.share',
    'prompts.export',
    'versions.create',
    'versions.restore',
    'api.use',
    'analytics.view'
  ],
  
  admin: [
    // Inherit all member permissions
    'prompts.view',
    'prompts.test',
    'prompts.create',
    'prompts.edit',
    'prompts.share',
    'prompts.export',
    'prompts.delete',
    'versions.view',
    'versions.create',
    'versions.restore',
    'versions.delete',
    'team.view',
    'team.invite',
    'team.remove',
    'workspace.view',
    'workspace.edit',
    'workspace.manage_settings',
    'api.view_keys',
    'api.create_keys',
    'api.delete_keys',
    'api.use',
    'analytics.view',
    'analytics.export',
    'admin.view_audit_log',
    'admin.manage_integrations'
  ],
  
  owner: [
    // Owners have all permissions
    'prompts.view',
    'prompts.test',
    'prompts.create',
    'prompts.edit',
    'prompts.delete',
    'prompts.share',
    'prompts.export',
    'versions.view',
    'versions.create',
    'versions.restore',
    'versions.delete',
    'team.view',
    'team.invite',
    'team.remove',
    'team.manage_roles',
    'workspace.view',
    'workspace.edit',
    'workspace.delete',
    'workspace.manage_billing',
    'workspace.manage_settings',
    'api.view_keys',
    'api.create_keys',
    'api.delete_keys',
    'api.use',
    'analytics.view',
    'analytics.export',
    'admin.view_audit_log',
    'admin.manage_integrations',
    'admin.manage_security'
  ]
};

// Helper function to check if a role has a permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

// Helper function to check multiple permissions (AND logic)
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

// Helper function to check multiple permissions (OR logic)
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

// Get all permissions for a role
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role];
}

// Check if a role can perform an action on a resource
export function canPerformAction(
  role: Role,
  resource: 'prompt' | 'team' | 'workspace' | 'api' | 'analytics',
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage'
): boolean {
  const permissionMap: Record<string, Permission> = {
    'prompt.view': 'prompts.view',
    'prompt.create': 'prompts.create',
    'prompt.edit': 'prompts.edit',
    'prompt.delete': 'prompts.delete',
    'team.view': 'team.view',
    'team.manage': 'team.invite',
    'workspace.view': 'workspace.view',
    'workspace.edit': 'workspace.edit',
    'workspace.delete': 'workspace.delete',
    'workspace.manage': 'workspace.manage_settings',
    'api.view': 'api.view_keys',
    'api.create': 'api.create_keys',
    'api.delete': 'api.delete_keys',
    'analytics.view': 'analytics.view'
  };
  
  const permission = permissionMap[`${resource}.${action}`];
  return permission ? hasPermission(role, permission) : false;
}

// Get minimum required role for a permission
export function getMinimumRole(permission: Permission): Role | null {
  const roles: Role[] = ['viewer', 'member', 'admin', 'owner'];
  
  for (const role of roles) {
    if (hasPermission(role, permission)) {
      return role;
    }
  }
  
  return null;
}

// Role hierarchy comparison
export function isRoleHigherOrEqual(role1: Role, role2: Role): boolean {
  const hierarchy: Record<Role, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    owner: 4
  };
  
  return hierarchy[role1] >= hierarchy[role2];
}

// Get display information for roles
export const roleInfo: Record<Role, { label: string; description: string; color: string }> = {
  viewer: {
    label: 'Viewer',
    description: 'Can view and test prompts',
    color: 'gray'
  },
  member: {
    label: 'Member',
    description: 'Can create and edit prompts',
    color: 'blue'
  },
  admin: {
    label: 'Admin',
    description: 'Can manage team and settings',
    color: 'purple'
  },
  owner: {
    label: 'Owner',
    description: 'Full access to everything',
    color: 'red'
  }
};

// Feature gates based on tier AND role
export function canAccessFeature(
  tier: 'free' | 'pro' | 'business',
  role: Role,
  feature: string
): boolean {
  // Tier-based restrictions
  const tierFeatures = {
    free: ['prompts.view', 'prompts.create', 'prompts.test'],
    pro: [
      'prompts.view', 'prompts.create', 'prompts.test', 'prompts.edit',
      'prompts.share', 'team.view', 'analytics.view', 'api.use'
    ],
    business: ['*'] // All features
  };
  
  // Business tier has access to everything
  if (tier === 'business') {
    return hasPermission(role, feature as Permission);
  }
  
  // Check if tier allows the feature
  const allowedFeatures = tierFeatures[tier];
  if (!allowedFeatures.includes(feature) && !allowedFeatures.includes('*')) {
    return false;
  }
  
  // Check if role has the permission
  return hasPermission(role, feature as Permission);
}