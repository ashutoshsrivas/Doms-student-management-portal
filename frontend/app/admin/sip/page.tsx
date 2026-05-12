import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminSIPContent from './AdminSIPContent';

export default function AdminSIPPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminSIPContent />
    </ProtectedRoute>
  );
}
