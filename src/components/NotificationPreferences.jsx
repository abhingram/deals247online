import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Mail, Monitor } from 'lucide-react';

export const NotificationPreferences = () => {
  const { preferences, updatePreferences, requestNotificationPermission } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handlePreferenceChange = (key, value) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updatePreferences(localPreferences);
  };

  const handleRequestPermission = async () => {
    await requestNotificationPermission();
  };

  const notificationTypes = [
    {
      key: 'deal_expiring',
      label: 'Deal Expiring Soon',
      description: 'Get notified when deals you\'re interested in are about to expire',
      icon: '⏰'
    },
    {
      key: 'new_deal',
      label: 'New Deals',
      description: 'Get notified about new deals in your favorite categories',
      icon: '🆕'
    },
    {
      key: 'price_drop',
      label: 'Price Drops',
      description: 'Get notified about significant price reductions',
      icon: '💰'
    },
    {
      key: 'system',
      label: 'System Updates',
      description: 'Important announcements and system notifications',
      icon: 'ℹ️'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-blue-500" />
            <div>
              <Label className="font-medium">Browser Notifications</Label>
              <p className="text-sm text-gray-600">
                Receive notifications in your browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={localPreferences.push_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('push_enabled', checked)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPermission}
              disabled={!localPreferences.push_enabled}
            >
              Enable
            </Button>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-green-500" />
            <div>
              <Label className="font-medium">Email Notifications</Label>
              <p className="text-sm text-gray-600">
                Receive notifications via email
              </p>
            </div>
          </div>
          <Switch
            checked={localPreferences.email_enabled}
            onCheckedChange={(checked) => handlePreferenceChange('email_enabled', checked)}
          />
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Notification Types</Label>
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">{type.icon}</span>
                <div>
                  <Label className="font-medium">{type.label}</Label>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
              <Switch
                checked={localPreferences[type.key]}
                onCheckedChange={(checked) => handlePreferenceChange(type.key, checked)}
              />
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};