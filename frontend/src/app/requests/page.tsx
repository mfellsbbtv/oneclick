import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ChangeRequestsList } from '@/components/ChangeRequestsList';

export default async function RequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Change Requests</h1>
        <p className="text-gray-500 mt-1">Track your submitted provisioning and termination requests.</p>
      </div>
      <ChangeRequestsList />
    </div>
  );
}
