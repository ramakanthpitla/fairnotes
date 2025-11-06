'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  accept: string; // e.g. 'application/pdf' or 'video/*'
  onUploaded: (url: string) => void;
};

export function FileUploader({ label, accept, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const signRes = await fetch('/api/admin/uploads/s3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!signRes.ok) {
        const msg = await signRes.text();
        throw new Error(`Failed to get upload URL: ${msg}`);
      }
      const { url, fields, objectUrl } = await signRes.json();

      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append('Content-Type', file.type || 'application/octet-stream');
      formData.append('file', file);

      try {
        const uploadRes = await fetch(url, { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(errText || 'S3 POST failed');
        }
        // Use the objectUrl from the API response
        onUploaded(objectUrl);
      } catch (postErr: any) {
        // Fallback: server-side upload (avoids CORS)
        const directForm = new FormData();
        directForm.append('file', file);
        directForm.append('filename', file.name);
        directForm.append('contentType', file.type);
        const direct = await fetch('/api/admin/uploads/direct', { method: 'POST', body: directForm });
        if (!direct.ok) {
          const msg = await direct.text();
          throw new Error(`Upload failed. S3 error: ${String(postErr)}. Direct error: ${msg}`);
        }
        const { url: directUrl } = await direct.json();
        onUploaded(directUrl);
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input type="file" accept={accept} onChange={handleFileChange} />
      <div className="text-xs text-muted-foreground">Uploads to secure cloud storage.</div>
      {error && <div className="text-xs text-destructive">{error}</div>}
      {uploading && (
        <Button variant="outline" disabled>
          Uploading...
        </Button>
      )}
    </div>
  );
}


