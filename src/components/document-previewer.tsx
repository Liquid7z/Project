'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Maximize } from 'lucide-react';
import { Button } from './ui/button';

interface DocumentPreviewerProps {
    name: string;
    type: string;
    url: string;
    previewUrl?: string;
}

export function DocumentPreviewer({ name, type, url, previewUrl }: DocumentPreviewerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <div className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-lg border bg-secondary/30 transition-all hover:border-accent">
                    {previewUrl ? (
                        <Image src={previewUrl} alt={`Preview of ${name}`} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <Maximize className="h-8 w-8 text-white" />
                    </div>
                     <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <Badge variant="secondary" className="mt-1 text-xs">{type}</Badge>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col glass-pane">
                <DialogHeader>
                    <DialogTitle className="font-headline truncate">{name}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative">
                    {previewUrl ? (
                        <Image src={previewUrl} alt={`Preview of ${name}`} fill className="object-contain" />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                            <FileText className="h-16 w-16 text-muted-foreground" />
                            <p className="mt-4 text-lg font-semibold">No preview available</p>
                            <Button asChild variant="glow" className="mt-4">
                                <a href={url} target="_blank" rel="noopener noreferrer">Download File</a>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
