
'use client';

import { Badge } from '@/components/ui/badge';
import { Paperclip, Download } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

interface DocumentPreviewerProps {
    name: string;
    type: string;
    url: string;
}

export function DocumentPreviewer({ name, type, url }: DocumentPreviewerProps) {
    const isPdf = type === 'application/pdf';

    return (
        <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-secondary/30 transition-all hover:border-accent">
            <Link href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label={`Open document ${name}`}>
                 <span className="sr-only">Open document</span>
            </Link>
            
            {isPdf ? (
                <iframe src={url} title={`Preview of ${name}`} className="h-full w-full border-none" />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                    <Paperclip className="h-10 w-10 text-muted-foreground" />
                </div>
            )}
            
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
             <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="truncate text-sm font-semibold">{name}</p>
                <Badge variant="secondary" className="mt-1 text-xs">{type}</Badge>
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

    