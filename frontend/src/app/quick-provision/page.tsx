'use client';

import { QuickProvisionForm } from '@/components/QuickProvisionForm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, UserMinus } from 'lucide-react';

export default function QuickProvisionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </Link>
          <Link href="/terminate">
            <Button variant="outline" className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50">
              <UserMinus className="h-4 w-4" />
              Terminate User
            </Button>
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            OneClick Provisioning
          </h1>
          <p className="mt-2 text-gray-600">
            Create Google Workspace and Microsoft 365 accounts in seconds
          </p>
        </div>

        <QuickProvisionForm
          onSubmit={(data) => {
            console.log('Provisioning data:', data);
            // Handle success - could redirect to success page
            window.location.href = '/provision/success';
          }}
        />

        {/* Status Card */}
        <Card className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50">
          <h3 className="font-semibold text-lg mb-2">✅ Current Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>n8n Orchestration Workflow: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Google Workspace Integration: Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Microsoft 365 Integration: Ready (with License Management)</span>
            </div>
          </div>
        </Card>

        {/* Features Card */}
        <Card className="mt-4 p-6">
          <h3 className="font-semibold text-lg mb-3">🎯 Features</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Auto License Selection:</strong> Licenses are automatically selected based on user role
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Group Assignment:</strong> Add users to Microsoft security groups
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Dual Provisioning:</strong> Create both Google and Microsoft accounts simultaneously
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✓</span>
              <div>
                <strong>Password Management:</strong> Auto-generate secure passwords or set custom ones
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}