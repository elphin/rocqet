'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const ctrlPressed = shortcut.ctrl ? event.ctrlKey : true;
        const metaPressed = shortcut.meta ? event.metaKey : true;
        const shiftPressed = shortcut.shift ? event.shiftKey : true;
        const altPressed = shortcut.alt ? event.altKey : true;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlPressed &&
          metaPressed &&
          shiftPressed &&
          altPressed
        ) {
          event.preventDefault();
          shortcut.handler();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalShortcuts(workspace?: string) {
  const router = useRouter();

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'n',
      meta: true,
      handler: () => {
        if (workspace) {
          router.push(`/${workspace}/prompts/new`);
          toast.success('Creating new prompt...');
        }
      },
      description: 'Create new prompt'
    },
    {
      key: 'd',
      meta: true,
      handler: () => {
        if (workspace) {
          router.push(`/${workspace}/dashboard`);
        }
      },
      description: 'Go to dashboard'
    },
    {
      key: 'p',
      meta: true,
      handler: () => {
        if (workspace) {
          router.push(`/${workspace}/prompts`);
        }
      },
      description: 'View all prompts'
    },
    {
      key: '/',
      meta: true,
      handler: () => {
        // Focus search input if it exists
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search'
    },
    {
      key: '?',
      shift: true,
      handler: () => {
        showShortcutsHelp();
      },
      description: 'Show keyboard shortcuts'
    }
  ];

  useKeyboardShortcuts(shortcuts);
}

function showShortcutsHelp() {
  toast.info(
    <div className="space-y-2">
      <p className="font-semibold">Keyboard Shortcuts</p>
      <div className="space-y-1 text-xs">
        <div>⌘K - Command palette</div>
        <div>⌘N - New prompt</div>
        <div>⌘D - Dashboard</div>
        <div>⌘P - All prompts</div>
        <div>⌘/ - Focus search</div>
        <div>? - Show this help</div>
      </div>
    </div>,
    { duration: 5000 }
  );
}