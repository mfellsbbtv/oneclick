'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_CONFIG, STATUS_COLORS, STATUS_LABELS } from '@/components/AppStatusBadge';
import type { UserAppAccount } from '@/lib/user-types';

interface AppAccountCardProps {
  account: UserAppAccount;
}

export function AppAccountCard({ account }: AppAccountCardProps) {
  const config = APP_CONFIG[account.app_provider] || { label: account.app_provider, icon: () => null };
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-base">{config.label}</CardTitle>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${STATUS_COLORS[account.status]}`}
          >
            {STATUS_LABELS[account.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {account.external_email && (
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{account.external_email}</span>
          </div>
        )}
        {account.external_user_id && (
          <div className="flex justify-between">
            <span className="text-gray-500">External ID</span>
            <span className="font-mono text-xs">{account.external_user_id}</span>
          </div>
        )}
        {Array.isArray(account.license_info) && account.license_info.length > 0 && (
          <div>
            <span className="text-gray-500">Licenses</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {account.license_info.map((lic, i) => (
                <span key={i} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                  {typeof lic === 'string' ? lic : (lic as Record<string, string>).name || JSON.stringify(lic)}
                </span>
              ))}
            </div>
          </div>
        )}
        {Array.isArray(account.groups_info) && account.groups_info.length > 0 && (
          <div>
            <span className="text-gray-500">Groups</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {account.groups_info.map((grp, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                  {typeof grp === 'string' ? grp : (grp as Record<string, string>).name || JSON.stringify(grp)}
                </span>
              ))}
            </div>
          </div>
        )}
        {account.provisioned_at && (
          <div className="flex justify-between text-gray-400 text-xs pt-1 border-t">
            <span>Provisioned</span>
            <span>{new Date(account.provisioned_at).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
