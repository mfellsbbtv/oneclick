import Link from 'next/link';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduledJobsList } from '@/components/ScheduledJobsList';

export default function SchedulesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scheduled Jobs</h1>
                <p className="text-sm text-gray-500">
                  View and manage pending provisioning and termination jobs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/quick-provision">
                <Button variant="outline" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Provision User
                </Button>
              </Link>
              <Link href="/terminate">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <UserMinus className="h-4 w-4" />
                  Terminate User
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ScheduledJobsList />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          OneClick Account Management - Scheduled Jobs
        </div>
      </footer>
    </div>
  );
}
