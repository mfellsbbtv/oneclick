'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppProvider } from '@/lib/providers';
import { MICROSOFT_LICENSES, LICENSE_RECOMMENDATIONS, MICROSOFT_GROUPS } from '@/lib/microsoft-config';
import { CheckCircle2, Circle, AlertCircle, Loader2, Users, Mail, Building, Briefcase } from 'lucide-react';

interface QuickProvisionFormProps {
  onSubmit?: (data: ProvisionData) => void;
}

interface ProvisionData {
  employee: {
    fullName: string;
    workEmail: string;
    personalEmail: string;
    department: string;
    jobTitle: string;
    role: string;
  };
  applications: {
    google: boolean;
    microsoft: boolean;
    googleConfig?: {
      primaryOrgUnit: string;
      licenseSku: string;
      passwordMode: 'auto' | 'custom';
      customPassword?: string;
    };
    microsoftConfig?: {
      usageLocation: string;
      licenses: string[];
      groups: string[];
      requirePasswordChange: boolean;
    };
  };
}

export function QuickProvisionForm({ onSubmit }: QuickProvisionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [provisionData, setProvisionData] = useState<ProvisionData>({
    employee: {
      fullName: '',
      workEmail: '',
      personalEmail: '',
      department: '',
      jobTitle: '',
      role: 'general',
    },
    applications: {
      google: true,
      microsoft: true,
      googleConfig: {
        primaryOrgUnit: '/',
        licenseSku: '1010020026', // Enterprise Standard (fixed)
        passwordMode: 'auto',
      },
      microsoftConfig: {
        usageLocation: 'US',
        licenses: ['f245ecc8-75af-4f8e-b61f-27d8114de5f3'], // Business Premium default
        groups: [],
        requirePasswordChange: true,
      },
    },
  });

  const roles = [
    { value: 'executive', label: '👔 Executive', icon: Building },
    { value: 'sales', label: '💰 Sales', icon: Briefcase },
    { value: 'developer', label: '💻 Developer', icon: Briefcase },
    { value: 'marketing', label: '📢 Marketing', icon: Users },
    { value: 'finance', label: '💵 Finance', icon: Briefcase },
    { value: 'general', label: '👤 General User', icon: Users },
  ];

  // Google Workspace Organizational Units (from your domain)
  const googleOrgUnits = [
    { value: '/', label: '/ (Root)' },
    { value: '/Administrators', label: 'Administrators' },
    { value: '/Archived', label: 'Archived' },
    { value: '/BBTV Website Share', label: 'BBTV Website Share' },
    { value: '/Consultants', label: 'Consultants' },
    { value: '/Developers', label: 'Developers' },
    { value: '/DO NOT DELETE', label: 'DO NOT DELETE' },
    { value: '/Google Chat', label: 'Google Chat' },
    { value: '/Google Drive Document Share', label: 'Google Drive Document Share' },
    { value: '/Google Drive Share', label: 'Google Drive Share' },
    { value: '/Google Drive Visitor Access', label: 'Google Drive Visitor Access' },
    { value: '/MFA Disabled Users', label: 'MFA Disabled Users' },
    { value: '/QA Test Accounts', label: 'QA Test Accounts' },
    { value: '/Service Accounts', label: 'Service Accounts' },
    { value: '/Service Accounts/App Passwords', label: 'Service Accounts → App Passwords' },
    { value: '/To Be Archived', label: 'To Be Archived' },
  ];

  // Auto-select licenses and OU based on role
  const handleRoleChange = (role: string) => {
    // Map roles to appropriate OUs based on your domain structure
    const roleToOU: Record<string, string> = {
      executive: '/Administrators',
      sales: '/',  // Regular users in root
      developer: '/Developers',
      marketing: '/',  // Regular users in root
      finance: '/',  // Regular users in root
      general: '/',  // Regular users in root
    };

    setProvisionData(prev => ({
      ...prev,
      employee: { ...prev.employee, role },
      applications: {
        ...prev.applications,
        googleConfig: {
          ...prev.applications.googleConfig!,
          primaryOrgUnit: roleToOU[role] || '/',
        },
        microsoftConfig: {
          ...prev.applications.microsoftConfig!,
          licenses: LICENSE_RECOMMENDATIONS[role as keyof typeof LICENSE_RECOMMENDATIONS] || ['cdd28e44-67e3-425e-be4c-737fab2899d3'],
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call n8n webhook endpoint
      const response = await fetch('/api/provision-n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...provisionData,
          applications: {
            ...provisionData.applications,
            // Only include enabled applications
            ...(provisionData.applications.google && {
              'google-workspace': provisionData.applications.googleConfig,
            }),
            ...(provisionData.applications.microsoft && {
              'microsoft-365': provisionData.applications.microsoftConfig,
            }),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Provisioning failed');
      }

      const result = await response.json();
      
      if (onSubmit) {
        onSubmit(provisionData);
      }

      // Show success message
      alert('✅ User provisioning initiated successfully!');
    } catch (error) {
      console.error('Provisioning error:', error);
      alert('❌ Provisioning failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>👤 Employee Information</CardTitle>
          <CardDescription>Basic information for the new user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                required
                value={provisionData.employee.fullName}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, fullName: e.target.value }
                }))}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="workEmail">Work Email *</Label>
              <Input
                id="workEmail"
                type="email"
                required
                value={provisionData.employee.workEmail}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, workEmail: e.target.value }
                }))}
                placeholder="john.doe@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={provisionData.employee.department}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, department: e.target.value }
                }))}
                placeholder="Engineering"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={provisionData.employee.jobTitle}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, jobTitle: e.target.value }
                }))}
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div>
            <Label>Role (Auto-selects licenses)</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleRoleChange(role.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    provisionData.employee.role === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{role.label}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Card */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Applications to Provision</CardTitle>
          <CardDescription>Select which accounts to create</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Workspace */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Switch
                  id="google"
                  checked={provisionData.applications.google}
                  onCheckedChange={(checked) => setProvisionData(prev => ({
                    ...prev,
                    applications: { ...prev.applications, google: checked }
                  }))}
                />
                <Label htmlFor="google" className="text-base font-semibold">
                  🔍 Google Workspace
                </Label>
              </div>
            </div>
            
            {provisionData.applications.google && (
              <div className="ml-8 p-3 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <Label className="text-sm">Organizational Unit</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded"
                    value={provisionData.applications.googleConfig?.primaryOrgUnit}
                    onChange={(e) => setProvisionData(prev => ({
                      ...prev,
                      applications: {
                        ...prev.applications,
                        googleConfig: {
                          ...prev.applications.googleConfig!,
                          primaryOrgUnit: e.target.value,
                        },
                      },
                    }))}
                  >
                    {googleOrgUnits.map(ou => (
                      <option key={ou.value} value={ou.value}>
                        {ou.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">License:</span> Google Workspace Enterprise Standard (Fixed)
                </div>
              </div>
            )}
          </div>

          {/* Microsoft 365 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Switch
                  id="microsoft"
                  checked={provisionData.applications.microsoft}
                  onCheckedChange={(checked) => setProvisionData(prev => ({
                    ...prev,
                    applications: { ...prev.applications, microsoft: checked }
                  }))}
                />
                <Label htmlFor="microsoft" className="text-base font-semibold">
                  📊 Microsoft 365
                </Label>
              </div>
            </div>
            
            {provisionData.applications.microsoft && (
              <div className="ml-8 p-3 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <Label className="text-sm">Selected Licenses (based on role)</Label>
                  <div className="mt-2 space-y-1">
                    {provisionData.applications.microsoftConfig?.licenses.map(licenseId => {
                      const license = MICROSOFT_LICENSES.find(l => l.skuId === licenseId);
                      return license ? (
                        <div key={licenseId} className="flex items-center space-x-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{license.icon} {license.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Security Group</Label>
                  <div className="mt-2">
                    {MICROSOFT_GROUPS.map(group => (
                      <label key={group.id} className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          value={group.id}
                          checked={provisionData.applications.microsoftConfig?.groups.includes(group.id)}
                          onChange={(e) => {
                            const groups = provisionData.applications.microsoftConfig?.groups || [];
                            const newGroups = e.target.checked
                              ? [...groups, group.id]
                              : groups.filter(g => g !== group.id);
                            setProvisionData(prev => ({
                              ...prev,
                              applications: {
                                ...prev.applications,
                                microsoftConfig: {
                                  ...prev.applications.microsoftConfig!,
                                  groups: newGroups,
                                },
                              },
                            }));
                          }}
                        />
                        <span className="text-sm font-medium">{group.displayName}</span>
                        {group.description && (
                          <span className="text-xs text-gray-500 ml-2">({group.description})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || (!provisionData.applications.google && !provisionData.applications.microsoft)}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Provisioning...
            </>
          ) : (
            <>
              🚀 Provision User
            </>
          )}
        </Button>
      </div>
    </form>
  );
}