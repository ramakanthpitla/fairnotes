'use client';

import { useEffect, useState } from 'react';
import { FileUploader } from '@/components/admin/file-uploader';

type Props = {
  name: string;
  label: string;
  accept: string;
  defaultValue?: string;
};

export function HiddenInputUploader({ name, label, accept, defaultValue }: Props) {
  const [value, setValue] = useState<string>(defaultValue || '');

  useEffect(() => {
    // Keep hidden input in sync so server receives value
    const el = document.getElementById(name) as HTMLInputElement | null;
    if (el) el.value = value;
  }, [name, value]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} id={name} defaultValue={defaultValue || ''} />
      <FileUploader label={label} accept={accept} onUploaded={setValue} />
      {value && (
        <div className="text-xs text-muted-foreground break-all">Uploaded: {value}</div>
      )}
    </div>
  );
}


