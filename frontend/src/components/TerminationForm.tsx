'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Circle, Loader2, UserMinus, Calendar, Mail, Shield, Clock } from 'lucide-react';
import { SchedulePicker } from '@/components/SchedulePicker';
import { ScheduleConfig } from '@/lib/scheduler-types';

// Available domains for the organization
const AVAILABLE_DOMAINS = [
  { value: '@rhei.com', label: '@rhei.com' },
  { value: '@bbtv.com', label: '@bbtv.com' },
  { value: '@broadbandtvcorp.com', label: '@broadbandtvcorp.com' },
  { value: '@bbtvholdingsinc.com', label: '@bbtvholdingsinc.com' },
  { value: '@canaracorp.com', label: '@canaracorp.com' },
  { value: '@c.bbtv.com', label: '@c.bbtv.com' },
];

interface TerminationData {
  userUsername: string;
  userDomain: string;
  managerUsername: string;
  managerDomain: string;
  terminationDate: string;
  githubUsername: string;
  hubspotReassignEmail: string;
  selectedApps: {
    googleWorkspace: boolean;
    microsoft365: boolean;
    jira: boolean;
    zoom: boolean;
    github: boolean;
    hubspot: boolean;
  };
}

interface TerminationResult {
  id: string;
  status: 'success' | 'error' | 'partial';
  timestamp: string;
  user: {
    email: string;
    name: string;
    manager: string;
  };
  termination: {
    date: string;
    totalApps: number;
    successful: number;
    failed: number;
  };
  appResults: Array<{
    app: string;
    status: string;
    success: boolean;
    message: string;
    results?: {
      moveToOU?: { success: boolean; message: string };
      removeGroups?: { success: boolean; message: string };
      resetPassword?: { success: boolean; message: string };
      signOut?: { success: boolean; message: string };
      vacationResponder?: { success: boolean; message: string };
      emailManager?: { success: boolean; message: string };
      findUser?: { success: boolean; message: string };
      deactivateUser?: { success: boolean; message: string };
    };
  }>;
  message: string;
}

export function TerminationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TerminationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    isScheduled: false,
    scheduleTime: null,
  });

  const [terminationData, setTerminationData] = useState<TerminationData>({
    userUsername: '',
    userDomain: '@rhei.com',
    managerUsername: '',
    managerDomain: '@rhei.com',
    terminationDate: new Date().toISOString().split('T')[0],
    githubUsername: '',
    hubspotReassignEmail: '',
    selectedApps: {
      googleWorkspace: true,
      microsoft365: false,
      jira: false,
      zoom: false,
      github: false,
      hubspot: false,
    },
  });

  // Computed email addresses
  const userEmail = terminationData.userUsername ? `${terminationData.userUsername}${terminationData.userDomain}` : '';
  const managerEmail = terminationData.managerUsername ? `${terminationData.managerUsername}${terminationData.managerDomain}` : '';

  const isFormValid =
    terminationData.userUsername &&
    terminationData.managerUsername &&
    confirmText.toLowerCase() === 'terminate';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Please fill all required fields and type "terminate" to confirm');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const terminationPayload = {
      userEmail,
      managerEmail,
      terminationDate: terminationData.terminationDate,
      selectedApps: terminationData.selectedApps,
      githubUsername: terminationData.githubUsername,
      hubspotReassignEmail: terminationData.hubspotReassignEmail,
    };

    try {
      if (scheduleConfig.isScheduled && scheduleConfig.scheduleTime) {
        // Schedule for later
        const response = await fetch('/api/scheduler/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_type: 'terminate',
            payload: terminationPayload,
            schedule_time: scheduleConfig.scheduleTime,
            tags: ['scheduled', 'termination'],
          }),
        });

        if (!response.ok) {
          throw new Error('Scheduling failed');
        }

        window.location.href = '/schedules';
      } else {
        // Immediate execution — existing flow unchanged
        const response = await fetch('/api/terminate-n8n', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(terminationPayload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Termination failed');
        }

        setResult(data);
      }
    } catch (err) {
      console.error('Termination error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTerminationData({
      userUsername: '',
      userDomain: '@rhei.com',
      managerUsername: '',
      managerDomain: '@rhei.com',
      terminationDate: new Date().toISOString().split('T')[0],
      githubUsername: '',
      hubspotReassignEmail: '',
      selectedApps: {
        googleWorkspace: true,
        microsoft365: false,
        jira: false,
        zoom: false,
        github: false,
        hubspot: false,
      },
    });
    setConfirmText('');
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.status === 'success' ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Termination Successful
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-red-500" />
                Termination {result.status === 'partial' ? 'Partial' : 'Failed'}
              </>
            )}
          </CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">User Email:</span>
              <span className="font-medium">{result.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Manager:</span>
              <span className="font-medium">{result.user.manager}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Termination Date:</span>
              <span className="font-medium">{result.termination.date}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Results Summary</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-blue-600">{result.termination.totalApps}</div>
                <div className="text-xs text-gray-600">Total Apps</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-green-600">{result.termination.successful}</div>
                <div className="text-xs text-gray-600">Successful</div>
              </div>
              <div className="bg-red-50 p-3 rounded text-center">
                <div className="text-2xl font-bold text-red-600">{result.termination.failed}</div>
                <div className="text-xs text-gray-600">Failed</div>
              </div>
            </div>
          </div>

          {result.appResults && result.appResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">App Details</h4>
              {result.appResults.map((appResult, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${appResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{appResult.app.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {appResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{appResult.message}</p>

                  {appResult.results && (
                    <div className="mt-2 space-y-1 text-xs">
                      {Object.entries(appResult.results).map(([step, stepResult]) => (
                        <div key={step} className="flex items-center gap-2">
                          {stepResult && stepResult.success ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : stepResult === null ? (
                            <Circle className="h-3 w-3 text-gray-400" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="capitalize">
                            {step.replace(/([A-Z])/g, ' $1').trim()}
                            {stepResult === null && ' (skipped)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button onClick={resetForm} className="w-full">
            Terminate Another User
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800">Warning: This action cannot be undone</h4>
          <p className="text-sm text-red-700 mt-1">
            Terminating a user will disable their accounts, reset their password, set an out-of-office message,
            and notify their manager. Make sure you have the correct user email before proceeding.
          </p>
        </div>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            User to Terminate
          </CardTitle>
          <CardDescription>Enter the details of the user being terminated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userUsername" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              User Email *
            </Label>
            <div className="flex mt-1">
              <Input
                id="userUsername"
                type="text"
                required
                value={terminationData.userUsername}
                onChange={(e) => setTerminationData(prev => ({
                  ...prev,
                  userUsername: e.target.value.toLowerCase().trim()
                }))}
                placeholder="username"
                className="rounded-r-none"
              />
              <select
                value={terminationData.userDomain}
                onChange={(e) => setTerminationData(prev => ({
                  ...prev,
                  userDomain: e.target.value
                }))}
                className="px-3 border border-l-0 rounded-r-md bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {AVAILABLE_DOMAINS.map(domain => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>
            {userEmail && (
              <p className="text-xs text-blue-600 mt-1">Will terminate: {userEmail}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">The email address of the user being terminated</p>
          </div>

          <div>
            <Label htmlFor="managerUsername" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Manager Email *
            </Label>
            <div className="flex mt-1">
              <Input
                id="managerUsername"
                type="text"
                required
                value={terminationData.managerUsername}
                onChange={(e) => setTerminationData(prev => ({
                  ...prev,
                  managerUsername: e.target.value.toLowerCase().trim()
                }))}
                placeholder="manager"
                className="rounded-r-none"
              />
              <select
                value={terminationData.managerDomain}
                onChange={(e) => setTerminationData(prev => ({
                  ...prev,
                  managerDomain: e.target.value
                }))}
                className="px-3 border border-l-0 rounded-r-md bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {AVAILABLE_DOMAINS.map(domain => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>
            {managerEmail && (
              <p className="text-xs text-blue-600 mt-1">Will notify: {managerEmail}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">The manager will receive termination notification and the new password</p>
          </div>

          <div>
            <Label htmlFor="terminationDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Termination Date
            </Label>
            <Input
              id="terminationDate"
              type="date"
              value={terminationData.terminationDate}
              onChange={(e) => setTerminationData(prev => ({
                ...prev,
                terminationDate: e.target.value
              }))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Applications to Terminate
          </CardTitle>
          <CardDescription>Select which accounts to terminate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="googleWorkspace"
                checked={terminationData.selectedApps.googleWorkspace}
                onCheckedChange={(checked) => setTerminationData(prev => ({
                  ...prev,
                  selectedApps: { ...prev.selectedApps, googleWorkspace: checked }
                }))}
              />
              <Label htmlFor="googleWorkspace" className="text-base">
                Google Workspace
              </Label>
            </div>
            <span className="text-sm text-gray-500">@rhei.com</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="microsoft365"
                checked={terminationData.selectedApps.microsoft365}
                onCheckedChange={(checked) => setTerminationData(prev => ({
                  ...prev,
                  selectedApps: { ...prev.selectedApps, microsoft365: checked }
                }))}
              />
              <Label htmlFor="microsoft365" className="text-base">
                Microsoft 365
              </Label>
            </div>
            <span className="text-sm text-gray-500">@bbtv.com</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="jira"
                checked={terminationData.selectedApps.jira}
                onCheckedChange={(checked) => setTerminationData(prev => ({
                  ...prev,
                  selectedApps: { ...prev.selectedApps, jira: checked }
                }))}
              />
              <Label htmlFor="jira" className="text-base">
                JIRA / Atlassian
              </Label>
            </div>
            <span className="text-sm text-gray-500">Atlassian Cloud</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="zoom"
                checked={terminationData.selectedApps.zoom}
                onCheckedChange={(checked) => setTerminationData(prev => ({
                  ...prev,
                  selectedApps: { ...prev.selectedApps, zoom: checked }
                }))}
              />
              <Label htmlFor="zoom" className="text-base">
                Zoom
              </Label>
            </div>
            <span className="text-sm text-gray-500">Zoom account</span>
          </div>

          {/* GitHub */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Switch
                  id="github"
                  checked={terminationData.selectedApps.github}
                  onCheckedChange={(checked) => setTerminationData(prev => ({
                    ...prev,
                    selectedApps: { ...prev.selectedApps, github: checked }
                  }))}
                />
                <Label htmlFor="github" className="text-base">
                  GitHub
                </Label>
              </div>
              <span className="text-sm text-gray-500">rhei-corp organization</span>
            </div>

            {terminationData.selectedApps.github && (
              <div className="ml-8 p-3 bg-white border rounded-lg">
                <Label htmlFor="githubUsername">GitHub Username *</Label>
                <Input
                  id="githubUsername"
                  type="text"
                  placeholder="e.g., johndoe"
                  value={terminationData.githubUsername}
                  onChange={(e) => setTerminationData(prev => ({
                    ...prev,
                    githubUsername: e.target.value.trim()
                  }))}
                  className="mt-1"
                  required={terminationData.selectedApps.github}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user&apos;s GitHub username (not email). This is required to remove them from the organization.
                </p>
              </div>
            )}
          </div>

          {/* HubSpot */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Switch
                  id="hubspot"
                  checked={terminationData.selectedApps.hubspot}
                  onCheckedChange={(checked) => setTerminationData(prev => ({
                    ...prev,
                    selectedApps: { ...prev.selectedApps, hubspot: checked }
                  }))}
                />
                <Label htmlFor="hubspot" className="text-base">
                  HubSpot
                </Label>
              </div>
              <span className="text-sm text-gray-500">CRM account</span>
            </div>

            {terminationData.selectedApps.hubspot && (
              <div className="ml-8 p-3 bg-white border rounded-lg">
                <Label htmlFor="hubspotReassignEmail">Reassign Records To (Email)</Label>
                <Input
                  id="hubspotReassignEmail"
                  type="email"
                  placeholder="e.g., manager@rhei.com"
                  value={terminationData.hubspotReassignEmail}
                  onChange={(e) => setTerminationData(prev => ({
                    ...prev,
                    hubspotReassignEmail: e.target.value.trim()
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contacts and deals owned by this user will be reassigned to this email. Leave blank to skip reassignment.
                </p>
              </div>
            )}
          </div>

          {!terminationData.selectedApps.googleWorkspace && !terminationData.selectedApps.microsoft365 && !terminationData.selectedApps.jira && !terminationData.selectedApps.zoom && !terminationData.selectedApps.github && !terminationData.selectedApps.hubspot && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              At least one application must be selected
            </p>
          )}
        </CardContent>
      </Card>

      <SchedulePicker onScheduleChange={setScheduleConfig} />

      {/* Confirmation Card */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Confirm Termination</CardTitle>
          <CardDescription>Type "terminate" to confirm this action</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Type "terminate" to confirm'
            className="border-red-200 focus:ring-red-500"
          />
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={resetForm} disabled={isLoading}>
          Clear Form
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={isLoading || !isFormValid || (!terminationData.selectedApps.googleWorkspace && !terminationData.selectedApps.microsoft365 && !terminationData.selectedApps.jira && !terminationData.selectedApps.zoom && !terminationData.selectedApps.github && !terminationData.selectedApps.hubspot) || (terminationData.selectedApps.github && !terminationData.githubUsername)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {scheduleConfig.isScheduled ? 'Scheduling...' : 'Terminating...'}
            </>
          ) : scheduleConfig.isScheduled ? (
            <>
              <Clock className="mr-2 h-4 w-4" />
              Schedule Termination
            </>
          ) : (
            <>
              <UserMinus className="mr-2 h-4 w-4" />
              Terminate Now
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
