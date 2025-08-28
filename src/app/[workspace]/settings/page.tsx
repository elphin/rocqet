'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Settings, 
  Users, 
  Key, 
  CreditCard, 
  Shield, 
  Database,
  Bell,
  Palette,
  ChevronRight,
  Building2
} from 'lucide-react';

export default function SettingsPage({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = use(params);
  const router = useRouter();

  const settingsSections = [
    {
      title: 'Workspace',
      items: [
        {
          icon: Building2,
          label: 'General',
          description: 'Workspace name, logo, and details',
          href: `/${workspace}/settings/general`,
          available: false
        },
        {
          icon: Users,
          label: 'Team Members',
          description: 'Invite and manage team members',
          href: `/${workspace}/settings/team`,
          available: true
        },
        {
          icon: Shield,
          label: 'Permissions',
          description: 'Configure roles and access control',
          href: `/${workspace}/settings/permissions`,
          available: false
        }
      ]
    },
    {
      title: 'Configuration',
      items: [
        {
          icon: Key,
          label: 'AI Provider Keys',
          description: 'Manage your OpenAI, Anthropic, and Google API keys',
          href: `/account/ai-providers`,
          available: true
        },
        {
          icon: Database,
          label: 'Integrations',
          description: 'Connect with external services',
          href: `/${workspace}/settings/integrations`,
          available: false
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Email and in-app notifications',
          href: `/${workspace}/settings/notifications`,
          available: false
        }
      ]
    },
    {
      title: 'Billing',
      items: [
        {
          icon: CreditCard,
          label: 'Subscription',
          description: 'Manage your plan and billing',
          href: `/${workspace}/settings/billing`,
          available: true
        },
        {
          icon: Palette,
          label: 'Appearance',
          description: 'Theme and display preferences',
          href: `/${workspace}/settings/appearance`,
          available: false
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Settings className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-sm text-gray-500">Manage your workspace settings</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {settingsSections.map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">{section.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.available) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="group relative rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100">
                            <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{item.label}</h3>
                            <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  );
                } else {
                  return (
                    <div
                      key={item.label}
                      className="relative rounded-lg bg-white p-6 shadow-sm opacity-50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-gray-100 p-2">
                          <Icon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.label}</h3>
                          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                          <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            Coming Soon
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}