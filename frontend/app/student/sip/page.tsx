import ProtectedRoute from '@/app/components/ProtectedRoute';
import SIPContent from './SIPContent';

export default function SIPPage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <SIPContent />
    </ProtectedRoute>
  );
}
