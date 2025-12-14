'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Download } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

interface DocumentPreviewerProps {
    name: string;
    type: string;
    url: string;
    previewUrls?: string[];
}

export function DocumentPreviewer({ name, type, url, previewUrls = [] }: DocumentPreviewerProps) {

    const hasPreviews = previewUrls && previewUrls.length > 0;

    return (
        <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-secondary/30 transition-all hover:border-accent">
            <Link href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Open document ${name}`}>
                 <span className="sr-only">Open document</span>
            </Link>
            {hasPreviews ? (
                <Image src={previewUrls[0]} alt={`Preview of ${name}`} fill className="object-cover" />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                    <Paperclip className="h-10 w-10 text-muted-foreground" />
                </div>
            )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
             <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="truncate text-sm font-semibold">{name}</p>
                <div className="flex justify-between items-center">
                    <Badge variant="secondary" className="mt-1 text-xs">{type}</Badge>
                    {hasPreviews && previewUrls.length > 1 && (
                        <Badge variant="outline" className="mt-1 text-xs bg-black/50 border-white/50">{previewUrls.length} pages</Badge>
                    )}
                </div>
            </div>
             <div className="absolute top-2 right-2 z-20">
                 <Button asChild size="icon" variant="secondary" className="h-8 w-8">
                     <a href={url} download={name} onClick={(e) => e.stopPropagation()} aria-label={`Download document ${name}`}>
                        <Download className="h-4 w-4" />
                     </a>
                 </Button>
            </div>
        </div>
    );
}
