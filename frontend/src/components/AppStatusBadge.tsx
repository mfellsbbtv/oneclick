'use client';

import { Globe, Monitor, Bug, Video, Github, BarChart3 } from 'lucide-react';
import type { AppProvider, AppAccountStatus } from '@/lib/user-types';

const APP_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  'google-workspace': { label: 'Google', icon: Globe },
  'microsoft-365': { label: 'Microsoft', icon: Monitor },
  'jira': { label: 'JIRA', icon: Bug },
  'zoom': { label: 'Zoom', icon: Video },
  'github': { label: 'GitHub', icon: Github },
  'hubspot': { label: 'HubSpot', icon: BarChart3 },
  'confluence': { label: 'Confluence', icon: Bug },
  'slack': { label: 'Slack', icon: Globe },
};

const STATUS_COLORS: Record<AppAccountStatus, string> = {
  active: 'bg-green-500',
  suspended: 'bg-yellow-500',
  deactivated: 'bg-red-500',
  not_provisioned: 'bg-gray-300',
  pending: 'bg-blue-500',
  error: 'bg-red-700',
};

const STATUS_LABELS: Record<AppAccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
  not_provisioned: 'Not Provisioned',
  pending: 'Pending',
  error: 'Error',
};

interface AppStatusBadgeProps {
  provider: AppProvider;
  status: AppAccountStatus;
  plan?: string;
}

export function AppStatusBadge({ provider, status, plan }: AppStatusBadgeProps) {
  const config = APP_CONFIG[provider] || { label: provider, icon: Globe };
  const Icon = config.icon;
  const title = plan
    ? `${config.label}: ${STATUS_LABELS[status]} (${plan})`
    : `${config.label}: ${STATUS_LABELS[status]}`;

  return (
    <div className="flex items-center gap-1.5" title={title}>
      <Icon className="h-3.5 w-3.5 text-gray-500" />
      <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
    </div>
  );
}

export { APP_CONFIG, STATUS_COLORS, STATUS_LABELS };
