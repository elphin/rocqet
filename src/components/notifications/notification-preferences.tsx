'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface NotificationPreferences {
  email_enabled: boolean;
  email_invites: boolean;
  email_mentions: boolean;
  email_updates: boolean;
  email_marketing: boolean;
  email_digest: boolean;
  email_digest_frequency: 'daily' | 'weekly' | 'never';
  app_invites: boolean;
  app_mentions: boolean;
  app_comments: boolean;
  app_updates: boolean;
  app_limit_warnings: boolean;
  app_system: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch preferences
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast.success('Notification preferences updated');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load preferences</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Enable Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Master toggle for all email notifications
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
            />
          </div>

          {preferences.email_enabled && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-invites">Workspace Invitations</Label>
                <Switch
                  id="email-invites"
                  checked={preferences.email_invites}
                  onCheckedChange={(checked) => updatePreference('email_invites', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-mentions">Mentions</Label>
                <Switch
                  id="email-mentions"
                  checked={preferences.email_mentions}
                  onCheckedChange={(checked) => updatePreference('email_mentions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-updates">Product Updates</Label>
                <Switch
                  id="email-updates"
                  checked={preferences.email_updates}
                  onCheckedChange={(checked) => updatePreference('email_updates', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email-marketing">Marketing Emails</Label>
                <Switch
                  id="email-marketing"
                  checked={preferences.email_marketing}
                  onCheckedChange={(checked) => updatePreference('email_marketing', checked)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-digest">Email Digest</Label>
                  <Switch
                    id="email-digest"
                    checked={preferences.email_digest}
                    onCheckedChange={(checked) => updatePreference('email_digest', checked)}
                  />
                </div>
                {preferences.email_digest && (
                  <Select
                    value={preferences.email_digest_frequency}
                    onValueChange={(value: any) => updatePreference('email_digest_frequency', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>In-App Notifications</CardTitle>
          <CardDescription>
            Choose which notifications appear in the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="app-invites">Workspace Invitations</Label>
            <Switch
              id="app-invites"
              checked={preferences.app_invites}
              onCheckedChange={(checked) => updatePreference('app_invites', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="app-mentions">Mentions</Label>
            <Switch
              id="app-mentions"
              checked={preferences.app_mentions}
              onCheckedChange={(checked) => updatePreference('app_mentions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="app-comments">Comments</Label>
            <Switch
              id="app-comments"
              checked={preferences.app_comments}
              onCheckedChange={(checked) => updatePreference('app_comments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="app-updates">Product Updates</Label>
            <Switch
              id="app-updates"
              checked={preferences.app_updates}
              onCheckedChange={(checked) => updatePreference('app_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="app-limit-warnings">Usage Limit Warnings</Label>
            <Switch
              id="app-limit-warnings"
              checked={preferences.app_limit_warnings}
              onCheckedChange={(checked) => updatePreference('app_limit_warnings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="app-system">System Announcements</Label>
            <Switch
              id="app-system"
              checked={preferences.app_system}
              onCheckedChange={(checked) => updatePreference('app_system', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Desktop */}
      <Card>
        <CardHeader>
          <CardTitle>Sound & Desktop</CardTitle>
          <CardDescription>
            Configure notification sounds and desktop notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Sound Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Play a sound when you receive a notification
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={preferences.sound_enabled}
              onCheckedChange={(checked) => updatePreference('sound_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-enabled">Desktop Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show browser desktop notifications
              </p>
            </div>
            <Switch
              id="desktop-enabled"
              checked={preferences.desktop_enabled}
              onCheckedChange={(checked) => {
                updatePreference('desktop_enabled', checked);
                if (checked && window.Notification?.permission === 'default') {
                  window.Notification.requestPermission();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}