'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

interface ProvisioningResult {
  app: string;
  status: 'success' | 'in_progress' | 'pending' | 'error';
  message: string;
}

export default function SuccessPage() {
  const router = useRouter();
  const [results, setResults] = useState<ProvisioningResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock results for testing
    const mockResults: ProvisioningResult[] = [
      { app: 'Google Workspace', status: 'success', message: 'User account created successfully' },
      { app: 'Slack', status: 'in_progress', message: 'Adding to channels...' },
      { app: 'Microsoft 365', status: 'pending', message: 'Queued for processing' },
    ];

    setTimeout(() => {
      setResults(mockResults);
      setLoading(false);
    }, 1500);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
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
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            Provisioning Started Successfully
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              <strong>Great!</strong> Your provisioning request has been submitted and is being processed. 
              You'll receive email notifications as each application is configured.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Provisioning Status</h3>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
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
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {result.status.replace('_', ' ')}
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
              onClick={() => router.push('/provision')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Provision Another User
            </Button>
            
            <Button onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}