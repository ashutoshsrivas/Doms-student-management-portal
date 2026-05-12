import ProtectedRoute from '@/app/components/ProtectedRoute';
import AdminAnswersContent from './AdminAnswersContent';

export default async function AdminAnswersPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'HOD', 'PLACEMENT_COORDINATOR']}>
      <AdminAnswersContent questionId={questionId} />
    </ProtectedRoute>
  );
}
