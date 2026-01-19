'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, ArrowLeft, MinusCircle, Printer, UserMinus } from 'lucide-react';
import Link from 'next/link';

interface ProvisioningResult {
  app: string;
  status: 'success' | 'in_progress' | 'pending' | 'error' | 'not_selected';
  message: string;
  details?: {
    email?: string;
    organizationalUnit?: string;
    license?: string;
    groups?: string[];
    password?: string;
  };
}

interface ProvisioningData {
  request: {
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
      googleConfig?: {
        primaryOrgUnit: string;
        licenseSku: string;
        passwordMode: string;
        groups?: string[];
      };
      microsoftConfig?: {
        usageLocation: string;
        licenses: string[];
        groups: string[];
        requirePasswordChange: boolean;
      };
    };
  };
  response: {
    id: string;
    status: string;
    timestamp: string;
    employee: {
      name: string;
      email: string;
      department: string;
      jobTitle: string;
    };
    provisioning: {
      totalApps: number;
      successful: number;
      failed: number;
    };
    results: Array<{
      app: string;
      success: boolean;
      status: string;
      message: string;
      userEmail?: string;
      results?: any;
    }>;
  };
  timestamp: string;
}

// License SKU mapping
const LICENSE_NAMES: Record<string, string> = {
  '1010020026': 'Google Workspace Enterprise Standard',
  '1010020027': 'Google Workspace Enterprise Plus',
  '1010020028': 'Google Workspace Business Starter',
  '1010020029': 'Google Workspace Business Standard',
  '1010020030': 'Google Workspace Business Plus',
};

export default function SuccessPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<ProvisioningResult[]>([]);
  const [provisioningData, setProvisioningData] = useState<ProvisioningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get provisioning data from localStorage
    const storedData = localStorage.getItem('lastProvisioning');

    if (storedData) {
      try {
        const data: ProvisioningData = JSON.parse(storedData);
        setProvisioningData(data);

        // Build results from actual data
        const appResults: ProvisioningResult[] = [];

        // Google Workspace
        if (data.request.applications.google) {
          const googleResult = data.response.results?.find(
            (r) => r.app === 'googleWorkspace' || r.app === 'google-workspace'
          );
          appResults.push({
            app: 'Google Workspace',
            status: googleResult?.success ? 'success' : googleResult ? 'error' : 'in_progress',
            message: googleResult?.message || 'Account created successfully',
            details: {
              email: data.request.employee.email,
              organizationalUnit: data.request.applications.googleConfig?.primaryOrgUnit || '/',
              license: LICENSE_NAMES[data.request.applications.googleConfig?.licenseSku || ''] || 'Enterprise Standard',
              groups: data.request.applications.googleConfig?.groups || [],
            },
          });
        } else {
          appResults.push({
            app: 'Google Workspace',
            status: 'not_selected',
            message: 'No account provisioned',
          });
        }

        // Microsoft 365
        if (data.request.applications.microsoft) {
          const msResult = data.response.results?.find(
            (r) => r.app === 'microsoft365' || r.app === 'microsoft-365'
          );
          appResults.push({
            app: 'Microsoft 365',
            status: msResult?.success ? 'success' : msResult ? 'error' : 'in_progress',
            message: msResult?.message || 'Account created with licenses assigned',
            details: {
              email: data.request.employee.email.replace('@rhei.com', '@bbtv.com'),
              groups: data.request.applications.microsoftConfig?.groups || [],
            },
          });
        } else {
          appResults.push({
            app: 'Microsoft 365',
            status: 'not_selected',
            message: 'No account provisioned',
          });
        }

        setResults(appResults);
      } catch (e) {
        console.error('Failed to parse provisioning data:', e);
        // Fallback to basic results
        setResults([
          { app: 'Google Workspace', status: 'not_selected', message: 'No account provisioned' },
          { app: 'Microsoft 365', status: 'not_selected', message: 'No account provisioned' },
        ]);
      }
    } else {
      // No data - show not selected for both
      setResults([
        { app: 'Google Workspace', status: 'not_selected', message: 'No account provisioned' },
        { app: 'Microsoft 365', status: 'not_selected', message: 'No account provisioned' },
      ]);
    }

    setLoading(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'not_selected':
        return <MinusCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'not_selected':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      case 'not_selected':
        return 'Not Selected';
      default:
        return status;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const googleResult = results.find((r) => r.app === 'Google Workspace' && r.status === 'success');

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Main Results Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Provisioning Started Successfully
            </CardTitle>
            <Link href="/terminate">
              <Button variant="outline" size="sm" className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50">
                <UserMinus className="h-4 w-4" />
                Terminate User
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {provisioningData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                <strong>Employee:</strong> {provisioningData.request.employee.firstName} {provisioningData.request.employee.lastName}
                <br />
                <strong>Email:</strong> {provisioningData.request.employee.email}
                {provisioningData.request.employee.department && (
                  <>
                    <br />
                    <strong>Department:</strong> {provisioningData.request.employee.department}
                  </>
                )}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Provisioning Status</h3>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <h4 className="font-medium">{result.app}</h4>
                          <p className="text-sm text-gray-600">{result.message}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium uppercase tracking-wide ${
                        result.status === 'not_selected' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {getStatusLabel(result.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => router.push('/quick-provision')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Provision Another User
            </Button>

            <Button onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>

            {googleResult && (
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex items-center gap-2 ml-auto"
              >
                <Printer className="w-4 h-4" />
                Print Summary
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Printable Google Workspace Summary */}
      {googleResult && provisioningData && (
        <Card className="print:shadow-none" ref={printRef}>
          <CardHeader className="print:pb-2">
            <CardTitle className="text-lg">Google Workspace Provisioning Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b bg-gray-50">
                    <td className="px-4 py-3 font-semibold w-1/3">Employee Name</td>
                    <td className="px-4 py-3">
                      {provisioningData.request.employee.firstName} {provisioningData.request.employee.lastName}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 font-semibold">Email Address</td>
                    <td className="px-4 py-3">{googleResult.details?.email}</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="px-4 py-3 font-semibold">Department</td>
                    <td className="px-4 py-3">{provisioningData.request.employee.department || 'Not specified'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 font-semibold">Job Title</td>
                    <td className="px-4 py-3">{provisioningData.request.employee.jobTitle || 'Not specified'}</td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="px-4 py-3 font-semibold">Organizational Unit</td>
                    <td className="px-4 py-3">{googleResult.details?.organizationalUnit}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 font-semibold">License</td>
                    <td className="px-4 py-3">{googleResult.details?.license}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 font-semibold">Groups</td>
                    <td className="px-4 py-3">
                      {googleResult.details?.groups && googleResult.details.groups.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {googleResult.details.groups.map((group, idx) => (
                            <li key={idx}>{group}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500">No groups assigned</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 print:mt-8">
              <p>Provisioned on: {new Date(provisioningData.timestamp).toLocaleString()}</p>
              <p className="mt-1">This document can be printed for your records.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
          }
          .print\\:pb-2 {
            padding-bottom: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
