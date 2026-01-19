'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MICROSOFT_LICENSES, LICENSE_RECOMMENDATIONS, MICROSOFT_GROUPS, getLicensesGroupedByCategory } from '@/lib/microsoft-config';
import { GOOGLE_GROUPS, GOOGLE_GROUP_RECOMMENDATIONS } from '@/lib/google-config';
import { GoogleGroupsSelector } from '@/components/GoogleGroupsSelector';
import { MicrosoftGroupsSelector } from '@/components/MicrosoftGroupsSelector';
import { CheckCircle2, Circle, AlertCircle, Loader2, Users, Mail, Building, Briefcase, AlertTriangle } from 'lucide-react';

interface QuickProvisionFormProps {
  onSubmit?: (data: ProvisionData) => void;
}

interface ProvisionData {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    personalEmail: string;
    department: string;
    jobTitle: string;
    role: string;
  };
  applications: {
    google: boolean;
    microsoft: boolean;
    jira: boolean;
    zoom: boolean;
    googleConfig?: {
      primaryOrgUnit: string;
      licenseSku: string;
      groups: string[];
      passwordMode: 'auto' | 'custom';
      customPassword?: string;
    };
    microsoftConfig?: {
      usageLocation: string;
      licenses: string[];
      groups: string[];
      requirePasswordChange: boolean;
    };
    jiraConfig?: {
      products: string[];
      groups: string[];
    };
  };
}

export function QuickProvisionForm({ onSubmit }: QuickProvisionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [provisionData, setProvisionData] = useState<ProvisionData>({
    employee: {
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      department: '',
      jobTitle: '',
      role: 'general',
    },
    applications: {
      google: true,
      microsoft: true,
      jira: false,
      zoom: false,
      googleConfig: {
        primaryOrgUnit: '/',
        licenseSku: '1010020026', // Enterprise Standard (fixed)
        groups: [],
        passwordMode: 'auto',
      },
      microsoftConfig: {
        usageLocation: 'US',
        licenses: ['f245ecc8-75af-4f8e-b61f-27d8114de5f3'], // Business Premium default
        groups: [],
        requirePasswordChange: true,
      },
      jiraConfig: {
        products: ['jira-software', 'confluence'],
        groups: ['jira-users', 'confluence-users'],
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

  // Auto-select licenses, OU, and groups based on role
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
          groups: GOOGLE_GROUP_RECOMMENDATIONS[role] || [],
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
            // Note: jira and jiraConfig are already in provisionData.applications
            // The payload builder handles them correctly
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Provisioning failed');
      }

      const result = await response.json();

      // Save provisioning data and results to localStorage for success page
      const provisioningData = {
        request: provisionData,
        response: result,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('lastProvisioning', JSON.stringify(provisioningData));

      if (onSubmit) {
        onSubmit(provisionData);
      }

      // Redirect to success page
      window.location.href = '/provision/success';
    } catch (error) {
      console.error('Provisioning error:', error);
      alert('Provisioning failed. Please try again.');
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
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                required
                value={provisionData.employee.firstName}
                onChange={(e) => {
                  const firstName = e.target.value;
                  const { lastName } = provisionData.employee;
                  // Auto-generate email: first initial + last name @rhei.com
                  const email = firstName && lastName
                    ? `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@rhei.com`
                    : '';

                  setProvisionData(prev => ({
                    ...prev,
                    employee: { ...prev.employee, firstName, email }
                  }));
                }}
                placeholder="John"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                required
                value={provisionData.employee.lastName}
                onChange={(e) => {
                  const lastName = e.target.value;
                  const { firstName } = provisionData.employee;
                  // Auto-generate email: first initial + last name @rhei.com
                  const email = firstName && lastName
                    ? `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@rhei.com`
                    : '';

                  setProvisionData(prev => ({
                    ...prev,
                    employee: { ...prev.employee, lastName, email }
                  }));
                }}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Work Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={provisionData.employee.email}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, email: e.target.value }
                }))}
                placeholder="jdoe@rhei.com"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated from first/last name</p>
            </div>
            <div>
              <Label htmlFor="personalEmail">Personal Email *</Label>
              <Input
                id="personalEmail"
                type="email"
                required
                value={provisionData.employee.personalEmail}
                onChange={(e) => setProvisionData(prev => ({
                  ...prev,
                  employee: { ...prev.employee, personalEmail: e.target.value }
                }))}
                placeholder="john.doe@gmail.com"
              />
              <p className="text-xs text-gray-500 mt-1">For onboarding instructions</p>
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

                <div>
                  <Label className="text-sm">Groups ({GOOGLE_GROUPS.length} available)</Label>
                  <div className="mt-2">
                    <GoogleGroupsSelector
                      groups={GOOGLE_GROUPS}
                      selectedGroups={provisionData.applications.googleConfig?.groups || []}
                      onSelectionChange={(selectedGroups) => {
                        setProvisionData(prev => ({
                          ...prev,
                          applications: {
                            ...prev.applications,
                            googleConfig: {
                              ...prev.applications.googleConfig!,
                              groups: selectedGroups,
                            },
                          },
                        }));
                      }}
                      pageSize={20}
                    />
                  </div>
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
              <div className="ml-8 p-3 bg-gray-50 rounded-lg space-y-4">
                {/* Licenses Section */}
                <div>
                  <Label className="text-sm font-medium">Licenses</Label>
                  <p className="text-xs text-gray-500 mb-2">Select licenses to assign to this user</p>

                  {Object.entries(getLicensesGroupedByCategory()).map(([category, licenses]) => (
                    <div key={category} className="mb-3">
                      <div className="text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                        {category}
                      </div>
                      <div className="space-y-1">
                        {licenses.map(license => {
                          const isSelected = provisionData.applications.microsoftConfig?.licenses.includes(license.skuId);
                          const isAvailable = license.availableLicenses > 0;
                          const isDisabled = !isAvailable;

                          return (
                            <label
                              key={license.skuId}
                              className={`flex items-center justify-between p-2 rounded border transition-colors ${
                                isDisabled
                                  ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                                  : isSelected
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isDisabled && !isSelected}
                                  onChange={(e) => {
                                    if (isDisabled && !isSelected) return;
                                    const currentLicenses = provisionData.applications.microsoftConfig?.licenses || [];
                                    const newLicenses = e.target.checked
                                      ? [...currentLicenses, license.skuId]
                                      : currentLicenses.filter(id => id !== license.skuId);
                                    setProvisionData(prev => ({
                                      ...prev,
                                      applications: {
                                        ...prev.applications,
                                        microsoftConfig: {
                                          ...prev.applications.microsoftConfig!,
                                          licenses: newLicenses,
                                        },
                                      },
                                    }));
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">
                                  {license.icon} {license.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAvailable ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    {license.availableLicenses} available
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    No licenses
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Selected licenses summary */}
                  {provisionData.applications.microsoftConfig?.licenses &&
                   provisionData.applications.microsoftConfig.licenses.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <span className="font-medium">Selected:</span>{' '}
                      {provisionData.applications.microsoftConfig.licenses.map(id => {
                        const license = MICROSOFT_LICENSES.find(l => l.skuId === id);
                        return license?.name || id;
                      }).join(', ')}
                    </div>
                  )}
                </div>

                {/* Groups Section */}
                <div>
                  <Label className="text-sm font-medium">Groups ({MICROSOFT_GROUPS.length} available)</Label>
                  <p className="text-xs text-gray-500 mb-2">Select groups to add the user to</p>
                  <MicrosoftGroupsSelector
                    groups={MICROSOFT_GROUPS}
                    selectedGroups={provisionData.applications.microsoftConfig?.groups || []}
                    onSelectionChange={(selectedGroups) => {
                      setProvisionData(prev => ({
                        ...prev,
                        applications: {
                          ...prev.applications,
                          microsoftConfig: {
                            ...prev.applications.microsoftConfig!,
                            groups: selectedGroups,
                          },
                        },
                      }));
                    }}
                    pageSize={20}
                  />
                </div>
              </div>
            )}
          </div>

          {/* JIRA / Atlassian */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Switch
                  id="jira"
                  checked={provisionData.applications.jira}
                  onCheckedChange={(checked) => setProvisionData(prev => ({
                    ...prev,
                    applications: { ...prev.applications, jira: checked }
                  }))}
                />
                <Label htmlFor="jira" className="text-base font-semibold">
                  🔷 JIRA / Atlassian
                </Label>
              </div>
            </div>

            {provisionData.applications.jira && (
              <div className="ml-8 p-3 bg-gray-50 rounded-lg space-y-4">
                {/* Products Section */}
                <div>
                  <Label className="text-sm font-medium">Products</Label>
                  <p className="text-xs text-gray-500 mb-2">Select Atlassian products to grant access to</p>
                  <div className="space-y-1">
                    {[
                      { id: 'jira-software', name: 'JIRA Software', icon: '🔧' },
                      { id: 'confluence', name: 'Confluence', icon: '📝' },
                      { id: 'jira-servicedesk', name: 'JIRA Service Management', icon: '🎫' },
                    ].map(product => {
                      const isSelected = provisionData.applications.jiraConfig?.products.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className={`flex items-center p-2 rounded border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentProducts = provisionData.applications.jiraConfig?.products || [];
                              const newProducts = e.target.checked
                                ? [...currentProducts, product.id]
                                : currentProducts.filter(id => id !== product.id);
                              setProvisionData(prev => ({
                                ...prev,
                                applications: {
                                  ...prev.applications,
                                  jiraConfig: {
                                    ...prev.applications.jiraConfig!,
                                    products: newProducts,
                                  },
                                },
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm">{product.icon} {product.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Groups Section */}
                <div>
                  <Label className="text-sm font-medium">Groups</Label>
                  <p className="text-xs text-gray-500 mb-2">Select groups to add the user to</p>
                  <div className="space-y-1">
                    {[
                      { id: 'jira-users', name: 'jira-users' },
                      { id: 'confluence-users', name: 'confluence-users' },
                      { id: 'developers', name: 'developers' },
                      { id: 'users', name: 'users' },
                    ].map(group => {
                      const isSelected = provisionData.applications.jiraConfig?.groups.includes(group.id);
                      return (
                        <label
                          key={group.id}
                          className={`flex items-center p-2 rounded border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentGroups = provisionData.applications.jiraConfig?.groups || [];
                              const newGroups = e.target.checked
                                ? [...currentGroups, group.id]
                                : currentGroups.filter(id => id !== group.id);
                              setProvisionData(prev => ({
                                ...prev,
                                applications: {
                                  ...prev.applications,
                                  jiraConfig: {
                                    ...prev.applications.jiraConfig!,
                                    groups: newGroups,
                                  },
                                },
                              }));
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm">{group.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Note:</span> User will be invited to Atlassian Cloud via email
                </div>
              </div>
            )}
          </div>

          {/* Zoom */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Switch
                  id="zoom"
                  checked={provisionData.applications.zoom}
                  onCheckedChange={(checked) => setProvisionData(prev => ({
                    ...prev,
                    applications: { ...prev.applications, zoom: checked }
                  }))}
                />
                <Label htmlFor="zoom" className="text-base font-semibold">
                  📹 Zoom
                </Label>
              </div>
            </div>

            {provisionData.applications.zoom && (
              <div className="ml-8 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Note:</span> User will receive a Zoom invitation email to activate their Basic (free) account
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
        <Button type="submit" disabled={isLoading || (!provisionData.applications.google && !provisionData.applications.microsoft && !provisionData.applications.jira && !provisionData.applications.zoom)}>
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