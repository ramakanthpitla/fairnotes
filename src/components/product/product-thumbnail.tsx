'use client';

import Image from 'next/image';
import { FileText, Video } from 'lucide-react';

interface ProductThumbnailProps {
  thumbnail: string | null;
  title: string;
  type: 'PDF' | 'VIDEO';
  className?: string;
}

export function ProductThumbnail({ 
  thumbnail, 
  title, 
  type, 
  className = '' 
}: ProductThumbnailProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          {type === 'PDF' ? (
            <FileText className="w-12 h-12 text-muted-foreground" />
          ) : (
            <Video className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}
