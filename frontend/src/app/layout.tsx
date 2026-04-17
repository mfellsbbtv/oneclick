import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Providers } from '@/components/providers/Providers';
import { UserMenu } from '@/components/UserMenu';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OneClick Provisioning',
  description: 'Account provisioning system for enterprise applications',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user?.role === 'admin' || session?.user?.role === 'superadmin';

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/">
                  <h1 className="text-2xl font-bold">OneClick Provisioning</h1>
                </Link>
                <div className="flex items-center gap-6">
                  <nav className="flex gap-4">
                    <Link href="/quick-provision" className="text-sm text-gray-600 hover:text-gray-900">
                      Provision
                    </Link>
                    <Link href="/terminate" className="text-sm text-gray-600 hover:text-gray-900">
                      Terminate
                    </Link>
                    <Link href="/users" className="text-sm text-gray-600 hover:text-gray-900">
                      Users
                    </Link>
                    <Link href="/requests" className="text-sm text-gray-600 hover:text-gray-900">
                      My Requests
                    </Link>
                    <Link href="/schedules" className="text-sm text-gray-600 hover:text-gray-900">
                      Schedules
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin/approvals"
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Approvals
                      </Link>
                    )}
                  </nav>
                  <UserMenu />
                </div>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
