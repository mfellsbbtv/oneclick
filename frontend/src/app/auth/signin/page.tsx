'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <h1 className="text-2xl font-bold">OneClick Provisioning</h1>
          <p className="text-sm text-gray-500">
            Sign in with your Google Workspace account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={() => signIn('google', { callbackUrl: '/' })}
          >
            Sign in with Google
          </Button>
          <p className="text-xs text-center text-gray-400">
            Restricted to authorized company domains
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
