import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SubmissionsList } from '@/components/admin/submissions-list';

export default async function AdminSubmissionsPage() {
  await requireAdmin();

  const submissions = await prisma.userSubmission.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const submissionsData = submissions.map((submission) => ({
    id: submission.id,
    title: submission.title,
    pdfUrl: submission.pdfUrl,
    status: submission.status,
    adminNotes: submission.adminNotes,
    productId: submission.productId,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    user: {
      id: submission.user.id,
      name: submission.user.name,
      email: submission.user.email,
    },
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">User Submissions</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Review and process user-uploaded study materials
        </p>
      </div>

      <SubmissionsList initialSubmissions={submissionsData} />
    </div>
  );
}
