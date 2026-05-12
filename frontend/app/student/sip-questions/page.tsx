import ProtectedRoute from '@/app/components/ProtectedRoute';
import StudentSIPQuestionsContent from './StudentSIPQuestionsContent';

export default function StudentSIPQuestionsPage() {
  return (
    <ProtectedRoute requiredRoles={['STUDENT']}>
      <StudentSIPQuestionsContent />
    </ProtectedRoute>
  );
}
