'use client';

import { ReactNode } from 'react';
import { hasPermission, Permission, Role } from '@/lib/permissions';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  role: Role;
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // For multiple permissions
}

export function PermissionGuard({
  role,
  permission,
  children,
  fallback,
  requireAll = true
}: PermissionGuardProps) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(role, p))
    : permissions.some(p => hasPermission(role, p));
  
  if (!hasAccess) {
    return fallback || <NoPermissionFallback />;
  }
  
  return <>{children}</>;
}

function NoPermissionFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Lock className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mb-1 text-sm font-medium text-gray-900">No Permission</h3>
        <p className="text-sm text-gray-500">
          You don't have permission to access this feature
        </p>
      </div>
    </div>
  );
}

// Hook version for programmatic use
import { useCallback } from 'react';

export function usePermission(role: Role) {
  const check = useCallback((permission: Permission | Permission[], requireAll = true) => {
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    return requireAll
      ? permissions.every(p => hasPermission(role, p))
      : permissions.some(p => hasPermission(role, p));
  }, [role]);
  
  return { check, hasPermission: check };
}