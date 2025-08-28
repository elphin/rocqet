'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Plus, Save, Play, Trash2, Archive, Copy, Edit, Share, 
  Download, Upload, Settings, Check, X, AlertCircle, 
  Zap, Rocket, Star, Heart, Moon, Sun
} from 'lucide-react';

export default function ButtonDemoPage() {
  const [darkMode, setDarkMode] = useState(false);

  const handleButtonClick = (name: string) => {
    toast.success(`${name} button clicked!`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Proposed new colors
  const proposedColors = {
    primaryCta: '#1E6BA8',
    primaryCtaHover: '#2563EB',
    primary: '#0F4C75',
    primaryHover: '#0A3A5C',
    success: '#10B981',
    successHover: '#059669',
    warning: '#F59E0B',
    warningHover: '#D97706',
    accent: '#8B5CF6',
    accentHover: '#7C3AED',
    destructive: '#EF4444',
    destructiveHover: '#DC2626',
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">🎨 ROCQET Button Color System</h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Interactive demo of current and proposed button variants
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDarkMode(!darkMode)}
              className="gap-2"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-12">
          {/* Current Button Variants */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Current Button Variants</h2>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 space-y-6">
              {/* Size variations */}
              <div>
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  Default Variant (Primary Blue)
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button size="sm" onClick={() => handleButtonClick('Small Default')}>
                    Small
                  </Button>
                  <Button onClick={() => handleButtonClick('Default')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Default
                  </Button>
                  <Button size="lg" onClick={() => handleButtonClick('Large Default')}>
                    Large Button
                  </Button>
                  <Button disabled>
                    Disabled
                  </Button>
                </div>
              </div>

              {/* All current variants */}
              <div>
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  All Current Variants
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button variant="default" onClick={() => handleButtonClick('Default')}>
                    Default
                  </Button>
                  <Button variant="destructive" onClick={() => handleButtonClick('Destructive')}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Destructive
                  </Button>
                  <Button variant="outline" onClick={() => handleButtonClick('Outline')}>
                    Outline
                  </Button>
                  <Button variant="secondary" onClick={() => handleButtonClick('Secondary')}>
                    Secondary
                  </Button>
                  <Button variant="ghost" onClick={() => handleButtonClick('Ghost')}>
                    Ghost
                  </Button>
                  <Button variant="link" onClick={() => handleButtonClick('Link')}>
                    Link Style
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Proposed Color System */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Proposed Button Color System</h2>
            
            {/* Primary Hierarchy */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 space-y-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Primary Action Hierarchy</h3>
              
              <div className="space-y-4">
                {/* Hero CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-md hover:shadow-lg transition-all"
                      style={{ backgroundColor: proposedColors.primaryCta }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.primaryCtaHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.primaryCta}
                      onClick={() => handleButtonClick('Primary CTA')}
                    >
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        New Prompt (Hero CTA)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Most important action on page
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.primaryCta)}
                  >
                    {proposedColors.primaryCta}
                  </code>
                </div>

                {/* Primary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: proposedColors.primary }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.primaryHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.primary}
                      onClick={() => handleButtonClick('Primary')}
                    >
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save Changes (Primary)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Standard primary actions
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.primary)}
                  >
                    {proposedColors.primary}
                  </code>
                </div>
              </div>
            </div>

            {/* Semantic Actions */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 space-y-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Semantic Action Colors</h3>
              
              <div className="space-y-4">
                {/* Success */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: proposedColors.success }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.successHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.success}
                      onClick={() => handleButtonClick('Success')}
                    >
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Run Prompt (Success)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Positive actions, executions
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.success)}
                  >
                    {proposedColors.success}
                  </code>
                </div>

                {/* Warning */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: proposedColors.warning }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.warningHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.warning}
                      onClick={() => handleButtonClick('Warning')}
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="h-4 w-4" />
                        Archive (Warning)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Caution actions, reversible
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.warning)}
                  >
                    {proposedColors.warning}
                  </code>
                </div>

                {/* Accent */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: proposedColors.accent }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.accentHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.accent}
                      onClick={() => handleButtonClick('Accent')}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Special Action (Accent)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Special or unique actions
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.accent)}
                  >
                    {proposedColors.accent}
                  </code>
                </div>

                {/* Destructive */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      className="px-4 py-2 rounded-md text-white font-medium shadow-sm hover:shadow-md transition-all"
                      style={{ backgroundColor: proposedColors.destructive }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = proposedColors.destructiveHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = proposedColors.destructive}
                      onClick={() => handleButtonClick('Destructive')}
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete (Destructive)
                      </div>
                    </button>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Dangerous, irreversible
                    </span>
                  </div>
                  <code 
                    className="text-xs bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded cursor-pointer"
                    onClick={() => copyToClipboard(proposedColors.destructive)}
                  >
                    {proposedColors.destructive}
                  </code>
                </div>
              </div>
            </div>

            {/* Use Case Examples */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-medium mb-4">Real Use Case Examples</h3>
              
              {/* Prompt Actions */}
              <div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  Prompt Detail Page Actions
                </h4>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    className="px-4 py-2 rounded-md text-white font-medium shadow-sm"
                    style={{ backgroundColor: proposedColors.primary }}
                  >
                    <Save className="h-4 w-4 mr-2 inline" />
                    Save
                  </button>
                  <button
                    className="px-4 py-2 rounded-md text-white font-medium shadow-sm"
                    style={{ backgroundColor: proposedColors.success }}
                  >
                    <Play className="h-4 w-4 mr-2 inline" />
                    Run
                  </button>
                  <Button variant="ghost" size="default">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                  <Button variant="ghost" size="default">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <button
                    className="px-4 py-2 rounded-md text-white font-medium shadow-sm"
                    style={{ backgroundColor: proposedColors.destructive }}
                  >
                    <Trash2 className="h-4 w-4 mr-2 inline" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  Form Actions
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    className="px-4 py-2 rounded-md text-white font-medium shadow-sm"
                    style={{ backgroundColor: proposedColors.primary }}
                  >
                    Submit
                  </button>
                  <Button variant="secondary">
                    Cancel
                  </Button>
                  <Button variant="outline">
                    Save as Draft
                  </Button>
                </div>
              </div>

              {/* Header CTA */}
              <div>
                <h4 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  Header Primary CTA
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    className="px-5 py-2.5 rounded-md text-white font-medium shadow-md hover:shadow-lg transition-all"
                    style={{ backgroundColor: proposedColors.primaryCta }}
                  >
                    <Plus className="h-5 w-5 mr-2 inline" />
                    New Prompt
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Implementation Code */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Implementation Examples</h2>
            <div className="bg-neutral-900 dark:bg-black text-white rounded-lg p-6 font-mono text-sm">
              <div className="space-y-4">
                <div>
                  <span className="text-green-400">// Hero CTA Button</span><br />
                  <span className="text-blue-400">&lt;Button</span> <span className="text-yellow-400">variant=</span><span className="text-green-300">"primaryCta"</span> <span className="text-yellow-400">size=</span><span className="text-green-300">"default"</span><span className="text-blue-400">&gt;</span><br />
                  <span className="ml-4">New Prompt</span><br />
                  <span className="text-blue-400">&lt;/Button&gt;</span>
                </div>
                <div>
                  <span className="text-green-400">// Success Action</span><br />
                  <span className="text-blue-400">&lt;Button</span> <span className="text-yellow-400">variant=</span><span className="text-green-300">"success"</span> <span className="text-yellow-400">onClick=</span><span className="text-orange-300">{'{runPrompt}'}</span><span className="text-blue-400">&gt;</span><br />
                  <span className="ml-4">Run Prompt</span><br />
                  <span className="text-blue-400">&lt;/Button&gt;</span>
                </div>
                <div>
                  <span className="text-green-400">// Destructive Action</span><br />
                  <span className="text-blue-400">&lt;Button</span> <span className="text-yellow-400">variant=</span><span className="text-green-300">"destructive"</span> <span className="text-yellow-400">onClick=</span><span className="text-orange-300">{'{deletePrompt}'}</span><span className="text-blue-400">&gt;</span><br />
                  <span className="ml-4">Delete</span><br />
                  <span className="text-blue-400">&lt;/Button&gt;</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}