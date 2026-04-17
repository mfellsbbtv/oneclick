'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { GoogleGroupsSelector } from '@/components/GoogleGroupsSelector';
import { MicrosoftGroupsSelector } from '@/components/MicrosoftGroupsSelector';
import { GOOGLE_GROUPS } from '@/lib/google-config';
import { MICROSOFT_GROUPS } from '@/lib/microsoft-config';

type AppOption = 'google' | 'microsoft' | 'github' | 'jira';

const APP_LABELS: Record<AppOption, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  github: 'GitHub',
  jira: 'Jira',
};

interface GroupChangeFormProps {
  userEmail: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GroupChangeForm({ userEmail, userName, onSuccess, onCancel }: GroupChangeFormProps) {
  const [app, setApp] = useState<AppOption>('google');
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When app changes, clear group selection
  const handleAppChange = (newApp: AppOption) => {
    setApp(newApp);
    setSelectedGroups([]);
    setTagInput('');
  };

  // Add a tag (for GitHub/Jira plain text input)
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !selectedGroups.includes(trimmed)) {
      setSelectedGroups((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroups.length === 0) {
      setError('Please select at least one group.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'group_change',
          target_user_email: userEmail,
          target_user_name: userName,
          payload: {
            userEmail,
            action,
            app,
            groups: selectedGroups,
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
        <p className="font-medium text-green-700">Group change request submitted for approval</p>
        <p className="text-sm text-gray-500">An admin will review your request shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-sm text-gray-600">
        Target: <span className="font-medium">{userName}</span> ({userEmail})
      </div>

      {/* App selector */}
      <div className="space-y-1.5">
        <Label>Application</Label>
        <div className="grid grid-cols-4 gap-2">
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

      {/* Action selector */}
      <div className="space-y-1.5">
        <Label>Action</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['add', 'remove'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                action === a
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {a === 'add' ? 'Add to groups' : 'Remove from groups'}
            </button>
          ))}
        </div>
      </div>

      {/* Group picker */}
      <div className="space-y-1.5">
        <Label>Groups</Label>
        {app === 'google' && (
          <GoogleGroupsSelector
            groups={GOOGLE_GROUPS}
            selectedGroups={selectedGroups}
            onSelectionChange={setSelectedGroups}
          />
        )}
        {app === 'microsoft' && (
          <MicrosoftGroupsSelector
            groups={MICROSOFT_GROUPS}
            selectedGroups={selectedGroups}
            onSelectionChange={setSelectedGroups}
          />
        )}
        {(app === 'github' || app === 'jira') && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
                placeholder={app === 'github' ? 'Team slug (e.g. engineering)' : 'Group name'}
              />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {selectedGroups.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm text-blue-700">
                    {g}
                    <button type="button" onClick={() => removeTag(g)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="gc-reason">Reason (optional)</Label>
        <textarea
          id="gc-reason"
          placeholder="Why is this group change needed?"
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
            'Submit Group Change Request'
          )}
        </Button>
      </div>
    </form>
  );
}
