import AdminSIPDetailContent from '../AdminSIPDetailContent';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default async function AdminSIPDetailPage({ params }: { params: Promise<{ sipId: string }> }) {
  const { sipId } = await params;

  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminSIPDetailContent sipId={sipId} />
    </ProtectedRoute>
  );
}
