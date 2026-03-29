'use client';

import { useState } from 'react';
import { Layout } from '../../interfaces/human/layout';
import { Card } from '../../shared/ui-primitives/card';
import { Button } from '../../shared/ui-primitives/button';
import { Badge } from '../../shared/ui-primitives/badge';
import { Input } from '../../shared/ui-primitives/input';
import { 
  User, Bell, Shield, Palette, Globe, Key, 
  ChevronRight, Moon, Sun, Monitor
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <Layout>
      <SettingsContent />
    </Layout>
  );
}

const settingsSections = [
  { id: 'profile', title: 'Profile', icon: User, description: 'Manage your identity information' },
  { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Configure notification preferences' },
  { id: 'security', title: 'Security', icon: Shield, description: 'Security settings and credentials' },
  { id: 'appearance', title: 'Appearance', icon: Palette, description: 'Customize the interface theme' },
  { id: 'language', title: 'Language & Region', icon: Globe, description: 'Language and timezone settings' },
  { id: 'api', title: 'API Keys', icon: Key, description: 'Manage API access tokens' },
];

function SettingsContent() {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <p className="text-gray-600 mb-8">Manage your account and preferences</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <Card className="p-4 h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                    activeSection === section.id
                      ? 'bg-pink-100 text-pink-700'
                      : 'text-gray-600 hover:bg-pink-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.title}</span>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Content */}
        <div className="md:col-span-2">
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'security' && <SecuritySettings />}
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'language' && <LanguageSettings />}
          {activeSection === 'api' && <APISettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Settings</h2>
      
      <div className="flex items-center gap-6 mb-8">
        <div className="relative">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
            alt="Profile"
            className="w-24 h-24 rounded-full border-4 border-pink-200"
          />
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-colors">
            <span className="text-sm">📷</span>
          </button>
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">Alice Chen</h3>
          <p className="text-gray-500">Platform Engineer</p>
          <Badge variant="human" className="mt-2">Human</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <Input label="Display Name" defaultValue="Alice Chen" />
        <Input label="Bio" defaultValue="Platform Engineer specializing in Kubernetes and automation" />
        <Input label="Email" defaultValue="alice@example.com" type="email" />
        <Input label="Timezone" defaultValue="UTC+8 (Asia/Shanghai)" />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {['devops', 'kubernetes', 'automation'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-sm flex items-center gap-1">
                {tag}
                <button className="hover:text-pink-900">×</button>
              </span>
            ))}
            <button className="px-3 py-1 rounded-full border-2 border-dashed border-pink-200 text-pink-400 text-sm hover:border-pink-300 hover:text-pink-500">
              + Add tag
            </button>
          </div>
        </div>

        <div className="pt-4">
          <Button>Save Changes</Button>
        </div>
      </div>
    </Card>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    agentCompletions: true,
    agentRequests: true,
    taskAssignments: true,
    spaceMentions: true,
    emailDigest: false,
  });

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Notification Preferences</h2>
      
      <div className="space-y-4">
        <ToggleSetting
          title="Agent Task Completions"
          description="Get notified when an agent completes a task"
          checked={settings.agentCompletions}
          onChange={(v) => setSettings(s => ({ ...s, agentCompletions: v }))}
        />
        <ToggleSetting
          title="Agent Requests"
          description="Get notified when an agent requests your input"
          checked={settings.agentRequests}
          onChange={(v) => setSettings(s => ({ ...s, agentRequests: v }))}
        />
        <ToggleSetting
          title="Task Assignments"
          description="Get notified when you are assigned a task"
          checked={settings.taskAssignments}
          onChange={(v) => setSettings(s => ({ ...s, taskAssignments: v }))}
        />
        <ToggleSetting
          title="Space Mentions"
          description="Get notified when someone mentions you in a space"
          checked={settings.spaceMentions}
          onChange={(v) => setSettings(s => ({ ...s, spaceMentions: v }))}
        />
        <ToggleSetting
          title="Daily Email Digest"
          description="Receive a daily summary of activities"
          checked={settings.emailDigest}
          onChange={(v) => setSettings(s => ({ ...s, emailDigest: v }))}
        />
      </div>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Security Settings</h2>
      
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-800">Two-Factor Authentication</h3>
              <p className="text-sm text-green-600">Enabled • Last used 2 days ago</p>
            </div>
            <Button variant="secondary" size="sm" className="ml-auto">
              Configure
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-800 mb-4">Active Sessions</h3>
          <div className="space-y-3">
            <SessionItem
              device="Chrome on macOS"
              location="Shanghai, China"
              current
            />
            <SessionItem
              device="Safari on iPhone"
              location="Shanghai, China"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-pink-100">
          <Button variant="secondary">Change Password</Button>
        </div>
      </div>
    </Card>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState('light');

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Appearance</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-4">Theme</h3>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption
              icon={<Sun className="w-6 h-6" />}
              label="Light"
              selected={theme === 'light'}
              onClick={() => setTheme('light')}
            />
            <ThemeOption
              icon={<Moon className="w-6 h-6" />}
              label="Dark"
              selected={theme === 'dark'}
              onClick={() => setTheme('dark')}
            />
            <ThemeOption
              icon={<Monitor className="w-6 h-6" />}
              label="Auto"
              selected={theme === 'auto'}
              onClick={() => setTheme('auto')}
            />
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-800 mb-4">Accent Color</h3>
          <div className="flex gap-3">
            {['#FF1493', '#87CEEB', '#98FB98', '#DDA0DD', '#FFD700'].map((color) => (
              <button
                key={color}
                className="w-10 h-10 rounded-full border-4 border-white shadow-md hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-pink-100">
          <h3 className="font-medium text-gray-800 mb-2">Interface Density</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Compact</Button>
            <Button variant="primary" size="sm">Comfortable</Button>
            <Button variant="secondary" size="sm">Spacious</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LanguageSettings() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Language & Region</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none bg-white">
            <option>English</option>
            <option>中文 (简体)</option>
            <option>日本語</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <select className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none bg-white">
            <option>Asia/Shanghai (GMT+8)</option>
            <option>America/New_York (GMT-5)</option>
            <option>Europe/London (GMT+0)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
          <select className="w-full px-4 py-2 rounded-2xl border-2 border-pink-200 focus:border-pink-400 outline-none bg-white">
            <option>YYYY-MM-DD</option>
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
          </select>
        </div>
      </div>
    </Card>
  );
}

function APISettings() {
  const [keys] = useState([
    { id: 1, name: 'Production Key', prefix: 'cp_live_...', lastUsed: '2 hours ago' },
    { id: 2, name: 'Development Key', prefix: 'cp_dev_...', lastUsed: '1 day ago' },
  ]);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">API Keys</h2>
      
      <div className="space-y-4">
        {keys.map((key) => (
          <div key={key.id} className="p-4 rounded-2xl bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">{key.name}</h3>
              <p className="text-sm text-gray-500">{key.prefix}</p>
              <p className="text-xs text-gray-400 mt-1">Last used {key.lastUsed}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">Copy</Button>
              <Button variant="ghost" size="sm">Revoke</Button>
            </div>
          </div>
        ))}
        
        <Button variant="secondary" className="w-full">
          <Key className="w-4 h-4 mr-2" />
          Generate New Key
        </Button>
      </div>
    </Card>
  );
}

function ToggleSetting({ title, description, checked, onChange }: { 
  title: string; 
  description: string; 
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <h4 className="font-medium text-gray-800">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-12 h-6 rounded-full transition-colors relative',
          checked ? 'bg-pink-500' : 'bg-gray-200'
        )}
      >
        <span className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
          checked ? 'left-7' : 'left-1'
        )} />
      </button>
    </div>
  );
}

function ThemeOption({ icon, label, selected, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2',
        selected
          ? 'border-pink-500 bg-pink-50 text-pink-700'
          : 'border-pink-100 hover:border-pink-200 text-gray-600'
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SessionItem({ device, location, current }: { device: string; location: string; current?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <Monitor className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-800">{device}</p>
            {current && <Badge variant="success" className="text-xs">Current</Badge>}
          </div>
          <p className="text-sm text-gray-500">{location}</p>
        </div>
      </div>
      {!current && (
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
          Revoke
        </Button>
      )}
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
