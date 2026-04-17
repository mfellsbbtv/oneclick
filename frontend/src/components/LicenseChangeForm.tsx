'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';
import { MICROSOFT_LICENSES } from '@/lib/microsoft-config';

type AppOption = 'microsoft' | 'zoom' | 'hubspot';
type LicenseAction = 'add' | 'remove' | 'change';

const APP_LABELS: Record<AppOption, string> = {
  microsoft: 'Microsoft 365',
  zoom: 'Zoom',
  hubspot: 'HubSpot',
};

const ACTION_LABELS: Record<LicenseAction, string> = {
  add: 'Add license',
  remove: 'Remove license',
  change: 'Change license',
};

const ZOOM_LICENSES = [
  { id: 'zoom-pro', name: 'Zoom Pro' },
  { id: 'zoom-business', name: 'Zoom Business' },
  { id: 'zoom-enterprise', name: 'Zoom Enterprise' },
];

const HUBSPOT_LICENSES = [
  { id: 'hs-starter', name: 'Starter' },
  { id: 'hs-professional', name: 'Professional' },
  { id: 'hs-enterprise', name: 'Enterprise' },
  { id: 'hs-sales-hub', name: 'Sales Hub' },
  { id: 'hs-service-hub', name: 'Service Hub' },
  { id: 'hs-marketing-hub', name: 'Marketing Hub' },
];

interface LicenseChangeFormProps {
  userEmail: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LicenseChangeForm({ userEmail, userName, onSuccess, onCancel }: LicenseChangeFormProps) {
  const [app, setApp] = useState<AppOption>('microsoft');
  const [action, setAction] = useState<LicenseAction>('add');
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAppChange = (newApp: AppOption) => {
    setApp(newApp);
    setSelectedLicenses([]);
  };

  const toggleLicense = (id: string) => {
    setSelectedLicenses((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const getLicenses = () => {
    if (app === 'microsoft') {
      return MICROSOFT_LICENSES
        .filter((l) => l.inUse)
        .map((l) => ({ id: l.skuId, name: l.name }));
    }
    if (app === 'zoom') return ZOOM_LICENSES;
    return HUBSPOT_LICENSES;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLicenses.length === 0) {
      setError('Please select at least one license.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: 'license_change',
          target_user_email: userEmail,
          target_user_name: userName,
          payload: {
            userEmail,
            action,
            app,
            licenses: selectedLicenses,
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
        <p className="font-medium text-green-700">License change request submitted for approval</p>
        <p className="text-sm text-gray-500">An admin will review your request shortly.</p>
      </div>
    );
  }

  const licenses = getLicenses();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-sm text-gray-600">
        Target: <span className="font-medium">{userName}</span> ({userEmail})
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

      {/* Action selector */}
      <div className="space-y-1.5">
        <Label>Action</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ACTION_LABELS) as LicenseAction[]).map((a) => (
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
              {ACTION_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* License list */}
      <div className="space-y-1.5">
        <Label>Licenses</Label>
        <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2 space-y-1">
          {licenses.map((license) => (
            <label key={license.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedLicenses.includes(license.id)}
                onChange={() => toggleLicense(license.id)}
                className="rounded"
              />
              <span className="text-sm">{license.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="lc-reason">Reason (optional)</Label>
        <textarea
          id="lc-reason"
          placeholder="Why is this license change needed?"
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
            'Submit License Change Request'
          )}
        </Button>
      </div>
    </form>
  );
}
