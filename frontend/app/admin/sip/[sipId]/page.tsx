import AdminSIPDetailContent from '../AdminSIPDetailContent';
import ProtectedRoute from '@/app/components/ProtectedRoute';

export default async function AdminSIPDetailPage({ params }) {
  const { sipId } = await params;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminSIPDetailContent sipId={sipId} />
    </ProtectedRoute>
  );
}
