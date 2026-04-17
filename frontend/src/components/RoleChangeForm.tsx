'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';

type AppOption = 'github' | 'jira' | 'hubspot';

const APP_LABELS: Record<AppOption, string> = {
  github: 'GitHub',
  jira: 'Jira',
  hubspot: 'HubSpot',
};

const ROLE_OPTIONS: Record<AppOption, { value: string; label: string }[]> = {
  github: [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'billing_manager', label: 'Billing Manager' },
  ],
  jira: [
    { value: 'basic', label: 'Basic' },
    { value: 'trusted-user', label: 'Trusted User' },
    { value: 'admin', label: 'Admin' },
    { value: 'site-admin', label: 'Site Admin' },
  ],
  hubspot: [
    { value: 'viewer', label: 'Viewer' },
    { value: 'member', label: 'Member' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ],
};

interface RoleChangeFormProps {
  userEmail: string;
  userName: string;
  currentRole?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RoleChangeForm({ userEmail, userName, currentRole, onSuccess, onCancel }: RoleChangeFormProps) {
  const [app, setApp] = useState<AppOption>('github');
  const [newRole, setNewRole] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAppChange = (newApp: AppOption) => {
    setApp(newApp);
    setNewRole('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole) {
      setError('Please select a new role.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'role_change',
          target_user_email: userEmail,
          target_user_name: userName,
          payload: {
            userEmail,
            app,
            newRole,
            ...(currentRole && { currentRole }),
            ...(reason && { reason }),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setSubmitted(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <p className="font-medium text-green-700">Role change request submitted for approval</p>
        <p className="text-sm text-gray-500">An admin will review your request shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-sm text-gray-600">
        Target: <span className="font-medium">{userName}</span> ({userEmail})
        {currentRole && (
          <span className="ml-2 text-gray-500">Current role: <span className="font-medium">{currentRole}</span></span>
        )}
      </div>

      {/* App selector */}
      <div className="space-y-1.5">
        <Label>Application</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(APP_LABELS) as AppOption[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => handleAppChange(a)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                app === a
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {APP_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* New role selector */}
      <div className="space-y-1.5">
        <Label htmlFor="new-role">New Role</Label>
        <select
          id="new-role"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a role...</option>
          {ROLE_OPTIONS[app].map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="rc-reason">Reason (optional)</Label>
        <textarea
          id="rc-reason"
          placeholder="Why is this role change needed?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            'Submit Role Change Request'
          )}
        </Button>
      </div>
    </form>
  );
}
