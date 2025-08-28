'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users, 
  CreditCard,
  Menu,
  X,
  Folder,
  Tag,
  Link2,
  Trash2,
  Database
} from 'lucide-react';
import { WorkspaceSwitcher } from './workspace-switcher';

interface WorkspaceSidebarProps {
  workspace: any;
  membership: any;
  user: any;
}

export function WorkspaceSidebar({ workspace, membership, user }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const workspaceSlug = workspace.slug;

  const navigation = [
    { name: 'Dashboard', href: `/${workspaceSlug}/dashboard`, icon: LayoutDashboard },
    { name: 'Prompts', href: `/${workspaceSlug}/prompts`, icon: FileText },
    { name: 'Chains', href: `/${workspaceSlug}/chains`, icon: Link2 },
    { name: 'Queries', href: `/${workspaceSlug}/queries`, icon: Database },
    { name: 'Folders', href: `/${workspaceSlug}/folders`, icon: Folder },
    { name: 'Tags', href: `/${workspaceSlug}/tags`, icon: Tag },
    { name: 'Trash', href: `/${workspaceSlug}/trash`, icon: Trash2 },
  ];

  const settingsNavigation = [
    { name: 'Settings', href: `/${workspaceSlug}/settings`, icon: Settings },
    { name: 'Team', href: `/${workspaceSlug}/settings/team`, icon: Users },
    { name: 'Billing', href: `/${workspaceSlug}/settings/billing`, icon: CreditCard },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          {/* Workspace Switcher */}
          <div className="border-b border-neutral-200 dark:border-neutral-800 p-3">
            <WorkspaceSwitcher currentWorkspace={workspace} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors duration-fast ${
                  isActive(item.href)
                    ? 'bg-primary-pale dark:bg-[rgb(25,61,163)]/20 text-primary dark:text-blue-400 border-l-3 border-primary dark:border-blue-400 -ml-px pl-[11px]'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                <item.icon className={`mr-2 h-4 w-4 transition-colors duration-fast ${
                  isActive(item.href) ? 'text-primary dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-500 dark:group-hover:text-neutral-400'
                }`} />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Settings Section */}
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            <nav className="px-2 py-4 space-y-1">
              {settingsNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-blue-50 dark:bg-[rgb(25,61,163)]/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${
                    isActive(item.href) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  }`} />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Section */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{user.email}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{membership?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <input type="checkbox" id="mobile-menu" className="peer hidden" />
        
        {/* Mobile menu button */}
        <label 
          htmlFor="mobile-menu" 
          className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-md cursor-pointer peer-checked:hidden"
        >
          <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </label>

        {/* Mobile menu close button */}
        <label 
          htmlFor="mobile-menu" 
          className="hidden peer-checked:block fixed top-4 left-4 z-50 p-2 bg-white dark:bg-neutral-800 rounded-lg shadow-md cursor-pointer"
        >
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </label>

        {/* Mobile sidebar overlay */}
        <label 
          htmlFor="mobile-menu" 
          className="hidden peer-checked:block fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
        />

        {/* Mobile sidebar panel */}
        <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-neutral-900 transform -translate-x-full peer-checked:translate-x-0 transition-transform duration-200 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Workspace Switcher */}
            <div className="border-b border-neutral-200 dark:border-neutral-800 p-3">
              <WorkspaceSwitcher currentWorkspace={workspace} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.href)
                      ? 'bg-blue-50 dark:bg-[rgb(25,61,163)]/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${
                    isActive(item.href) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  }`} />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Settings Section */}
            <div className="border-t border-gray-200">
              <nav className="px-2 py-4 space-y-1">
                {settingsNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${
                      isActive(item.href) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                    }`} />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* User Section */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">{membership?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}