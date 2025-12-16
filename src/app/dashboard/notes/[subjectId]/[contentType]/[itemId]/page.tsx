
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader, AlertTriangle, ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { DocumentPreviewer } from '@/components/document-previewer';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface Block {
    id: string;
    type: 'text' | 'image' | 'document';
    content?: string;
    fileName?: string;
    fileType?: string;
    downloadUrl?: string;
    previewUrl?: string;
}


const BlockViewer = ({ block }: { block: Block }) => {
    if (block.type === 'text') {
        return (
            <div className="w-full overflow-x-auto">
                <div
                    className="prose prose-sm md:prose-base dark:prose-invert max-w-none w-full prose-p:text-muted-foreground prose-headings:text-foreground"
                    dangerouslySetInnerHTML={{ __html: block.content || '' }}
                />
            </div>
        );
    }
    
    if (block.type === 'image' && (block.downloadUrl || block.previewUrl)) {
        return (
            <div className="not-prose my-4">
                <Image src={block.previewUrl || block.downloadUrl!} alt={block.fileName || 'Uploaded image'} width={800} height={600} className="rounded-md mx-auto" />
            </div>
        )
    }

    if (block.type === 'document' && block.downloadUrl) {
        return (
             <div className="not-prose my-4">
                <DocumentPreviewer name={block.fileName!} type={block.fileType!} url={block.downloadUrl} />
            </div>
        )
    }

    return null;
}


export default function ContentPreviewPage({ params }: { params: { subjectId: string; contentType: string; itemId: string } }) {
    const { subjectId, contentType, itemId } = React.use(params);
    const router = useRouter();

    const [scale, setScale] = useState(1);
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const itemRef = useMemoFirebase(() => {
        if (!user || !subjectId || !contentType || !itemId) return null;
        return doc(firestore, 'users', user.uid, 'subjects', subjectId, contentType, itemId);
    }, [user, subjectId, contentType, itemId, firestore]);

    const { data: item, isLoading: isItemLoading, error: itemError } = useDoc(itemRef);
    
    const subjectRef = useMemoFirebase(() => {
      if (!user || !subjectId ) return null;
      return doc(firestore, 'users', user.uid, 'subjects', subjectId);
    }, [user, subjectId, firestore]);
    
    const { data: subject, isLoading: isSubjectLoading } = useDoc(subjectRef);
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    const isLoading = isUserLoading || isItemLoading || isSubjectLoading;
    
    const blocks = item?.blocks || [];

    const getEditUrl = () => {
        return `/dashboard/notes/${subjectId}/${contentType}/${itemId}/edit`;
    }

    if (isLoading) {
        return (
            <div className="max-w-5xl mx-auto space-y-8 pb-12">
                 {heroImage && (
                    <div className="h-48 md:h-64 w-full relative rounded-lg overflow-hidden">
                        <Skeleton className="w-full h-full" />
                    </div>
                )}
                 <div className="flex items-center justify-between -mt-20 md:-mt-24 relative z-10 px-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
                 <div className="space-y-6 px-4">
                    <Card className="glass-pane overflow-hidden p-6">
                        <CardHeader className="!p-0 !pb-4 border-b">
                             <CardTitle className="font-headline text-lg">
                                 <Skeleton className="h-6 w-48" />
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="!p-0 !pt-6">
                            <Skeleton className="h-10 w-3/4" />
                        </CardContent>
                    </Card>
                    <Card className="glass-pane">
                        <CardContent className="p-6 space-y-6">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-8 w-3/4" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }
    
    if (itemError) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="mt-4 font-semibold">Failed to load item</p>
                <p className="text-sm text-muted-foreground">{itemError.message}</p>
                <Button variant="outline" size="sm" asChild className="mt-4">
                   <Link href={`/dashboard/notes/${subjectId}`}>Return to Subject</Link>
                </Button>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">Item not found</p>
                 <Button variant="outline" size="sm" asChild className="mt-4">
                   <Link href={`/dashboard/notes/${subjectId}`}>Return to Subject</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4 pb-12">
            
            <div className="flex items-center justify-between px-4 sm:px-0 flex-wrap gap-4">
                 <Link href={`/dashboard/notes/${subjectId}`}>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                 <div className="flex items-center gap-2 p-2 rounded-md glass-pane">
                    <ZoomOut className="h-4 w-4" />
                    <Slider
                        value={[scale]}
                        onValueChange={(value) => setScale(value[0])}
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        className="w-24 md:w-32"
                        aria-label="Zoom slider"
                    />
                    <ZoomIn className="h-4 w-4" />
                 </div>
                <Button variant="glow" onClick={() => router.push(getEditUrl())}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Item
                </Button>
            </div>
            
            <div className="space-y-6 px-4 sm:px-0">
                <Card className={cn("glass-pane overflow-hidden p-6 transition-all", item.isImportant && "important-glow")}>
                    <CardHeader className="!p-0 !pb-4 border-b">
                         <CardTitle className="font-headline text-lg">
                            From subject: <Link href={`/dashboard/notes/${subjectId}`} className="text-accent hover:underline">{subject?.name || '...'}</Link>
                         </CardTitle>
                    </CardHeader>
                    <CardContent className="!p-0 !pt-6">
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">{item.title}</h1>
                    </CardContent>
                </Card>

                <Card className="glass-pane">
                    <CardContent className="p-6 w-full" style={{overflow: 'visible'}}>
                        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className="transition-transform duration-200">
                            <div className="space-y-6">
                                {blocks.map((block: Block) => (
                                   <BlockViewer key={block.id} block={block} />
                                ))}
                                 {blocks.length === 0 && (
                                   <div className="text-center p-8 text-muted-foreground">
                                        <p>This item is empty.</p>
                                   </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

    