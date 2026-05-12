import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminSIPQuestionsContent from './AdminSIPQuestionsContent';

export default function AdminSIPQuestionsPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminSIPQuestionsContent />
    </ProtectedRoute>
  );
}
