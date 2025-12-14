'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Maximize, Paperclip } from 'lucide-react';
import { Button } from './ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface DocumentPreviewerProps {
    name: string;
    type: string;
    url: string;
    previewUrls?: string[];
}

export function DocumentPreviewer({ name, type, url, previewUrls = [] }: DocumentPreviewerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const hasPreviews = previewUrls && previewUrls.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                 <div className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg border bg-secondary/30 transition-all hover:border-accent">
                    {hasPreviews ? (
                        <Image src={previewUrls[0]} alt={`Preview of ${name}`} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                            <Paperclip className="h-10 w-10 text-muted-foreground" />
                        </div>
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <Maximize className="h-8 w-8 text-white" />
                    </div>
                     <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="mt-1 text-xs">{type}</Badge>
                            {hasPreviews && previewUrls.length > 1 && (
                                <Badge variant="outline" className="mt-1 text-xs bg-black/50 border-white/50">{previewUrls.length} pages</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col glass-pane">
                <DialogHeader>
                    <DialogTitle className="font-headline truncate">{name}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative my-4">
                    {hasPreviews ? (
                        <Carousel className="w-full h-full">
                            <CarouselContent className="h-full">
                                {previewUrls.map((previewUrl, index) => (
                                    <CarouselItem key={index} className="h-full">
                                        <div className="w-full h-full relative">
                                            <Image src={previewUrl} alt={`Preview of ${name} page ${index + 1}`} fill className="object-contain" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {previewUrls.length > 1 && (
                                <>
                                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                                </>
                            )}
                        </Carousel>
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
