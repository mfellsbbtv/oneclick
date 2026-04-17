'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

type AccountAction = 'suspend' | 'reactivate' | 'password_reset';

const ACTION_LABELS: Record<AccountAction, string> = {
  suspend: 'Suspend User',
  reactivate: 'Reactivate User',
  password_reset: 'Reset Password',
};

const ACTION_DESCRIPTIONS: Record<AccountAction, string> = {
  suspend: 'This will suspend the user account across Google Workspace, preventing login.',
  reactivate: 'This will reactivate the suspended user account, restoring access.',
  password_reset: 'This will force a password reset for the user on their next login.',
};

const ACTION_N8N_MAP: Record<AccountAction, string> = {
  suspend: 'suspend',
  reactivate: 'reactivate',
  password_reset: 'reset_password',
};

interface AccountActionFormProps {
  userEmail: string;
  userName: string;
  action: AccountAction;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountActionForm({ userEmail, userName, action, onSuccess, onCancel }: AccountActionFormProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: action,
          target_user_email: userEmail,
          target_user_name: userName,
          payload: {
            userEmail,
            app: 'google',
            action: ACTION_N8N_MAP[action],
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
        <p className="font-medium text-green-700">Request submitted for approval</p>
        <p className="text-sm text-gray-500">An admin will review your request shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="font-medium text-amber-800">{ACTION_LABELS[action]}</p>
          <p className="mt-1 text-sm text-amber-700">{ACTION_DESCRIPTIONS[action]}</p>
          <p className="mt-2 text-sm font-medium text-amber-800">Target: {userName} ({userEmail})</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason (optional)</Label>
        <textarea
          id="reason"
          placeholder="Provide a reason for this action..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          variant={action === 'suspend' ? 'destructive' : 'default'}
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
          ) : (
            `Submit ${ACTION_LABELS[action]} Request`
          )}
        </Button>
      </div>
    </form>
  );
}
