import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OneClick Provisioning',
  description: 'Account provisioning system for enterprise applications',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                <nav className="flex gap-4">
                  <Link href="/quick-provision" className="text-sm text-gray-600 hover:text-gray-900">
                    Provision
                  </Link>
                  <Link href="/terminate" className="text-sm text-gray-600 hover:text-gray-900">
                    Terminate
                  </Link>
                  <Link href="/schedules" className="text-sm text-gray-600 hover:text-gray-900">
                    Schedules
                  </Link>
                </nav>
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