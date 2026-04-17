import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalDashboard } from '@/components/ApprovalDashboard';

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin';
  if (!isAdmin) {
    redirect('/');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-gray-500 mt-1">Review and approve or reject pending change requests.</p>
      </div>
      <ApprovalDashboard />
    </div>
  );
}
