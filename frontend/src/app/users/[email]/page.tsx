import { UserDetailPage } from '@/components/UserDetailPage';

export default function UserPage({ params }: { params: { email: string } }) {
  return <UserDetailPage email={decodeURIComponent(params.email)} />;
}
