'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, 
  Users, 
  CreditCard,
  Key,
  Shield,
  Bell,
  Database,
  Webhook,
  Activity,
  Server,
  Plug
} from 'lucide-react';

interface SettingsSidebarProps {
  workspaceSlug: string;
}

export function SettingsSidebar({ workspaceSlug }: SettingsSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'General',
      href: `/${workspaceSlug}/settings`,
      icon: Settings,
      description: 'Workspace name, slug, and preferences'
    },
    {
      name: 'Team',
      href: `/${workspaceSlug}/settings/team`,
      icon: Users,
      description: 'Manage team members and permissions'
    },
    {
      name: 'API Keys',
      href: `/${workspaceSlug}/settings/api-keys`,
      icon: Key,
      description: 'Manage AI provider API keys'
    },
    {
      name: 'Database Connections',
      href: `/${workspaceSlug}/settings/databases`,
      icon: Server,
      description: 'Connect your own databases (Pro+)'
    },
    {
      name: 'Billing',
      href: `/${workspaceSlug}/settings/billing`,
      icon: CreditCard,
      description: 'Subscription and payment methods'
    },
    {
      name: 'Security',
      href: `/${workspaceSlug}/settings/security`,
      icon: Shield,
      description: 'Security settings and audit logs'
    },
    {
      name: 'Notifications',
      href: `/${workspaceSlug}/settings/notifications`,
      icon: Bell,
      description: 'Email and in-app notifications'
    },
    {
      name: 'Integrations',
      href: `/${workspaceSlug}/settings/integrations`,
      icon: Plug,
      description: 'Third-party integrations'
    },
    {
      name: 'Webhooks',
      href: `/${workspaceSlug}/settings/webhooks`,
      icon: Webhook,
      description: 'Webhook endpoints and events'
    },
    {
      name: 'Activity',
      href: `/${workspaceSlug}/settings/activity`,
      icon: Activity,
      description: 'Workspace activity and logs'
    }
  ];

  const isActive = (href: string) => {
    // Exact match for the main settings page
    if (href === `/${workspaceSlug}/settings` && pathname === `/${workspaceSlug}/settings`) {
      return true;
    }
    // For other pages, check if the path starts with the href
    if (href !== `/${workspaceSlug}/settings` && pathname.startsWith(href)) {
      return true;
    }
    return false;
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Settings
        </h2>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-start px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <item.icon className={`flex-shrink-0 mr-3 h-5 w-5 ${
                  active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <div className="flex-1">
                  <div className={active ? 'font-semibold' : ''}>
                    {item.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    active ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}