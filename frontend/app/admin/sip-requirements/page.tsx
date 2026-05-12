import ProtectedRoute from '@/app/components/ProtectedRoute';
import SIPRequirementsContent from './SIPRequirementsContent';

export default function SIPRequirementsPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <SIPRequirementsContent />
    </ProtectedRoute>
  );
}
