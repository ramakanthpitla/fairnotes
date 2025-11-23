'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Award, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  adminNotes?: string;
}

export default function ContributePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [ownsRights, setOwnsRights] = useState(false);
  const [credits, setCredits] = useState(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/contribute');
      return;
    }

    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status, router]);

  const fetchUserData = async () => {
    try {
      const [creditsRes, submissionsRes] = await Promise.all([
        fetch('/api/user/credits'),
        fetch('/api/user/submissions')
      ]);

      if (creditsRes.ok) {
        const { credits: userCredits } = await creditsRes.json();
        setCredits(userCredits);
      }

      if (submissionsRes.ok) {
        const { submissions: userSubmissions } = await submissionsRes.json();
        setSubmissions(userSubmissions);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    console.log('📁 File selected:', { fileName: selectedFile?.name, type: selectedFile?.type, size: selectedFile?.size });
    
    if (selectedFile) {
      // Check file extension as fallback for type detection
      const isValidType = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
      
      if (!isValidType) {
        console.error('❌ Invalid file type:', selectedFile.type);
        toast.error('Please select a PDF file');
        return;
      }
      
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        console.error('❌ File too large:', selectedFile.size);
        toast.error('File size must be less than 50MB');
        return;
      }
      
      console.log('✅ File validation passed, setting file state');
      setFile(selectedFile);
    } else {
      console.warn('⚠️ No file selected or file input cleared');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      toast.error('No internet connection. Please check your network and try again.');
      return;
    }

    if (!file || !title.trim()) {
      toast.error('Please provide both title and PDF file');
      return;
    }

    if (!ownsRights) {
      toast.error('Please confirm that the PDF does not violate copyright.');
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Selected file must be a PDF');
      return;
    }

    setUploading(true);
    console.log('📤 Starting PDF upload...', { fileName: file.name, fileSize: file.size, title });

    try {
      // Step 1: Get presigned URL
      console.log('📋 Requesting presigned URL...');
      const presignedRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      console.log('✅ Presigned URL response status:', presignedRes.status);

      if (!presignedRes.ok) {
        const errorData = await presignedRes.json().catch(() => ({}));
        console.error('❌ Presigned URL error:', errorData);
        throw new Error(errorData.error || `Failed to get presigned URL (${presignedRes.status})`);
      }

      const responseData = await presignedRes.json();
      console.log('✅ Presigned URL received:', { key: responseData.key, hasUrl: !!responseData.url, hasPublicUrl: !!responseData.publicUrl });
      
      const { url, key, publicUrl } = responseData;
      
      if (!url || !publicUrl) {
        console.error('❌ Missing URL or publicUrl in response:', responseData);
        throw new Error('Invalid presigned URL response - missing url or publicUrl');
      }

      // Step 2: Upload to S3
      console.log('📤 Uploading to S3...');
      const s3Response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
        credentials: 'omit',
      });

      console.log('✅ S3 upload response status:', s3Response.status);

      if (!s3Response.ok) {
        const responseText = await s3Response.text().catch(() => '');
        console.error('❌ S3 upload error:', { status: s3Response.status, response: responseText });
        throw new Error(`S3 upload failed: ${s3Response.status} ${responseText}`.trim());
      }

      console.log('✅ File uploaded to S3 successfully');

      // Step 3: Create submission record
      console.log('📝 Creating submission record...', { title, pdfUrl: publicUrl });
      const submitRes = await fetch('/api/user/submit-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          pdfUrl: publicUrl,
        }),
      });

      console.log('✅ Submission API response status:', submitRes.status);

      if (!submitRes.ok) {
        const errorData = await submitRes.json().catch(() => ({}));
        console.error('❌ Submission error:', errorData);
        throw new Error(errorData.error || `Failed to create submission record (${submitRes.status})`);
      }

      const submitData = await submitRes.json();
      console.log('✅ Submission created successfully:', submitData);

      toast.success('PDF submitted successfully! We will review it soon.');
      setTitle('');
      setFile(null);
      setOwnsRights(false);
      fetchUserData();
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Contribute
          <span className="md:block"> &amp; Earn Credits</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Share your study materials and earn credits to access any product for 60 days!
        </p>
      </div>

      {/* Credits Display */}
      <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-full">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Credit Balance</p>
              <p className="text-3xl font-bold text-purple-600">{credits}</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>1 Credit = 1 Product</p>
            <p>60 Days Access</p>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-blue-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <FileText className="w-4 h-4 text-blue-600" />
          </span>
          How It Works
        </h3>
        <ul className="space-y-2 text-sm text-blue-900">
          <li>• Upload your high-quality study PDF with a descriptive title</li>
          <li>• Our admin team will review your submission</li>
          <li>• If approved, you earn 1 credit point</li>
          <li>• Use 1 credit to access any product for 60 days</li>
          <li>• If rejected, your PDF is deleted and no credit is added</li>
          <li>• Copyrighted materials that you do not own are not accepted</li>
          <li>• If you own the copyright, email us to collaborate</li>
        </ul>
      </Card>

      {/* Upload Form */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Submit Your PDF</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title / Description</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Data Structures Notes - Full Semester"
              required
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="pdf-file">PDF File (Max 50MB)</Label>
            <div className="mt-2">
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                disabled={uploading}
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="copyright-confirmation"
              checked={ownsRights}
              onCheckedChange={(checked) => setOwnsRights(Boolean(checked))}
              className="mt-1"
            />
            <Label htmlFor="copyright-confirmation" className="text-sm text-muted-foreground leading-tight">
              I confirm that this document is not copyrighted by others.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={uploading || !file || !title.trim() || !ownsRights}>
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Submit PDF
              </>
            )}
          </Button>
          <div className="mt-2 text-xs text-muted-foreground">
            Status: {uploading ? 'Uploading' : 'Ready'} | File: {file ? '✓' : '✗'} | Title: {title.trim() ? '✓' : '✗'} | Rights: {ownsRights ? '✓' : '✗'}
          </div>
        </form>
      </Card>

      {/* Submissions History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No submissions yet</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{submission.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                    {submission.adminNotes && submission.status === 'REJECTED' && (
                      <p className="text-sm text-red-600 mt-2">
                        Reason: {submission.adminNotes}
                      </p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor(submission.status)}`}>
                    {getStatusIcon(submission.status)}
                    <span className="text-sm font-medium">{submission.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
