'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  title: string;
  pdfUrl: string;
  status: string;
  adminNotes: string | null;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Props {
  initialSubmissions: Submission[];
}

export function SubmissionsList({ initialSubmissions }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewDialog, setViewDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const filteredSubmissions = submissions.filter((s) =>
    filter === 'ALL' ? true : s.status === filter
  );

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/submissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: selectedSubmission.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve submission');
      }

      const data = await res.json();
      
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? { ...s, status: 'APPROVED', productId: data.productId }
            : s
        )
      );

      toast.success('Submission approved! User credited.');
      setActionDialog(null);
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error approving submission:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve submission');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch('/api/admin/submissions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          reason: rejectionReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject submission');
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id
            ? { ...s, status: 'REJECTED', adminNotes: rejectionReason }
            : s
        )
      );

      toast.success('Submission rejected and deleted from S3');
      setActionDialog(null);
      setSelectedSubmission(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject submission');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50';
      case 'REJECTED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'PENDING').length;

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status}
            {status === 'PENDING' && pendingCount > 0 && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No submissions found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{submission.title}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <User className="w-4 h-4" />
                    <span>{submission.user.name || submission.user.email}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(submission.createdAt).toLocaleString()}
                  </p>

                  {submission.adminNotes && (
                    <p className="text-sm text-red-600 mt-2">
                      <strong>Admin Notes:</strong> {submission.adminNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div
                    className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor(
                      submission.status
                    )}`}
                  >
                    {getStatusIcon(submission.status)}
                    <span className="text-sm font-medium">{submission.status}</span>
                  </div>

                  <div className="flex gap-2 flex-wrap md:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 md:flex-none min-w-[100px]"
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setViewDialog(true);
                      }}
                    >
                      View PDF
                    </Button>

                    {submission.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 md:flex-none min-w-[100px]"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setActionDialog('approve');
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 md:flex-none min-w-[100px]"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setActionDialog('reject');
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View PDF Dialog - Full Screen */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="fixed inset-0 max-w-none w-screen h-screen m-0 p-0 rounded-none bg-black/95 flex flex-col border-0">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base md:text-lg truncate text-white">{selectedSubmission?.title}</DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-slate-400 mt-1">
                  Submitted by {selectedSubmission?.user.name || selectedSubmission?.user.email}
                </DialogDescription>
              </div>
              <button
                onClick={() => setViewDialog(false)}
                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </DialogHeader>
          {selectedSubmission && (
            <div className="flex-1 w-full overflow-hidden">
              <iframe
                src={`${selectedSubmission.pdfUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title="PDF Preview"
                allow="fullscreen"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
            <DialogDescription>
              This will convert the submission to a product and credit the user with 1 point.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>Title:</strong> {selectedSubmission?.title}
            </p>
            <p className="text-sm mt-2">
              <strong>User:</strong> {selectedSubmission?.user.name || selectedSubmission?.user.email}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? 'Approving...' : 'Approve & Credit User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              This will delete the PDF from S3 and notify the user with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Reason for Rejection</Label>
            <Input
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Poor quality, duplicate content, etc."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Reject Submission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
