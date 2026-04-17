'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Mail, Building, Briefcase, User, Shield, Loader2,
  Pause, Play, Settings, UserMinus, X,
} from 'lucide-react';
import { AppAccountCard } from '@/components/AppAccountCard';
import { AccountActionForm } from '@/components/AccountActionForm';
import { GroupChangeForm } from '@/components/GroupChangeForm';
import { LicenseChangeForm } from '@/components/LicenseChangeForm';
import { RoleChangeForm } from '@/components/RoleChangeForm';
import type { UserWithAccounts, AppProvider } from '@/lib/user-types';

const ALL_PROVIDERS: AppProvider[] = [
  'google-workspace', 'microsoft-365', 'jira', 'zoom', 'github', 'hubspot',
];

type ActiveDialog = 'suspend' | 'reactivate' | 'modify' | null;
type ModifyTab = 'groups' | 'licenses' | 'role';

interface UserDetailPageProps {
  email: string;
}

function ModalOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function UserDetailPage({ email }: UserDetailPageProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [modifyTab, setModifyTab] = useState<ModifyTab>('groups');

  const { data: user, isLoading, error } = useQuery<UserWithAccounts>({
    queryKey: ['managed-user', email],
    queryFn: async () => {
      const res = await fetch(`/api/directory/users/${encodeURIComponent(email)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('User not found');
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
  });

  const handleDialogClose = () => {
    setActiveDialog(null);
    queryClient.invalidateQueries({ queryKey: ['managed-user', email] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            {error?.message || 'User not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build a map of existing accounts
  const accountsByProvider = new Map(
    user.app_accounts?.map((a) => [a.app_provider, a]) ?? []
  );

  return (
    <div className="space-y-6">
      <Link href="/users">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
      </Link>

      {/* User Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{user.full_name}</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {user.email}
                </span>
                {user.department && (
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" /> {user.department}
                  </span>
                )}
                {user.job_title && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {user.job_title}
                  </span>
                )}
                {user.manager_email && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" /> Manager: {user.manager_email}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.status === 'active' ? 'bg-green-100 text-green-800' :
                  user.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                  user.status === 'terminated' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-600'
                }`}
              >
                {user.status}
              </span>
              {(user.is_admin || user.is_delegated_admin) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <Shield className="h-3 w-3" />
                  {user.is_admin ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        {user.org_unit_path && (
          <CardContent className="pt-0 text-sm text-gray-500">
            Org Unit: {user.org_unit_path}
            {user.last_synced_at && (
              <span className="ml-4">
                Last synced: {new Date(user.last_synced_at).toLocaleString()}
              </span>
            )}
          </CardContent>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('suspend')}
          disabled={user.status === 'suspended' || user.status === 'terminated'}
        >
          <Pause className="mr-2 h-4 w-4" /> Suspend
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveDialog('reactivate')}
          disabled={user.status === 'active' || user.status === 'terminated'}
        >
          <Play className="mr-2 h-4 w-4" /> Reactivate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setModifyTab('groups'); setActiveDialog('modify'); }}
        >
          <Settings className="mr-2 h-4 w-4" /> Modify
        </Button>
        <Link href={`/terminate`}>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
            <UserMinus className="mr-2 h-4 w-4" /> Terminate
          </Button>
        </Link>
      </div>

      {/* App Accounts Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Application Accounts</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_PROVIDERS.map((provider) => {
            const account = accountsByProvider.get(provider);
            if (account) {
              return <AppAccountCard key={provider} account={account} />;
            }
            const config: Record<string, string> = {
              'google-workspace': 'Google Workspace',
              'microsoft-365': 'Microsoft 365',
              'jira': 'JIRA',
              'zoom': 'Zoom',
              'github': 'GitHub',
              'hubspot': 'HubSpot',
            };
            return (
              <Card key={provider} className="opacity-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{config[provider]}</CardTitle>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                      Not Provisioned
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                  No account configured
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Suspend Dialog */}
      {activeDialog === 'suspend' && (
        <ModalOverlay title="Suspend User" onClose={handleDialogClose}>
          <AccountActionForm
            action="suspend"
            userEmail={user.email}
            userName={user.full_name}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </ModalOverlay>
      )}

      {/* Reactivate Dialog */}
      {activeDialog === 'reactivate' && (
        <ModalOverlay title="Reactivate User" onClose={handleDialogClose}>
          <AccountActionForm
            action="reactivate"
            userEmail={user.email}
            userName={user.full_name}
            onSuccess={handleDialogClose}
            onCancel={handleDialogClose}
          />
        </ModalOverlay>
      )}

      {/* Modify Dialog (tabbed: Groups / Licenses / Role) */}
      {activeDialog === 'modify' && (
        <ModalOverlay title="Modify User" onClose={handleDialogClose}>
          {/* Tabs */}
          <div className="flex border-b mb-5 -mx-6 px-6">
            {(['groups', 'licenses', 'role'] as ModifyTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setModifyTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  modifyTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'groups' ? 'Groups' : tab === 'licenses' ? 'Licenses' : 'Role'}
              </button>
            ))}
          </div>

          {modifyTab === 'groups' && (
            <GroupChangeForm
              userEmail={user.email}
              userName={user.full_name}
              onSuccess={handleDialogClose}
              onCancel={handleDialogClose}
            />
          )}
          {modifyTab === 'licenses' && (
            <LicenseChangeForm
              userEmail={user.email}
              userName={user.full_name}
              onSuccess={handleDialogClose}
              onCancel={handleDialogClose}
            />
          )}
          {modifyTab === 'role' && (
            <RoleChangeForm
              userEmail={user.email}
              userName={user.full_name}
              onSuccess={handleDialogClose}
              onCancel={handleDialogClose}
            />
          )}
        </ModalOverlay>
      )}
    </div>
  );
}
