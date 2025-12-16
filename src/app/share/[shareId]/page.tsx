
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { Loader, AlertTriangle, Lock, LogIn, UserPlus, Save } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import React from 'react';

interface SharedNote {
    id: string;
    originalOwnerName: string;
    title: string;
    blocks: any[];
    watermarkRemoved: boolean;
    originalItemType: 'notes' | 'examQuestions' | 'resources';
}

function getPreviewContent(blocks: any[]): string {
    const firstTextBlock = blocks.find(b => b.type === 'text');
    if (!firstTextBlock || !firstTextBlock.content) {
        return '<p>No preview available.</p>';
    }
    // Take first 300 characters for preview
    const snippet = firstTextBlock.content.replace(/<[^>]+>/g, '').substring(0, 300);
    return `<p>${snippet}...</p>`;
}

export default function SharePage() {
    const params = useParams();
    const router = useRouter();
    const shareId = params.shareId as string;
    const { user, firestore, isUserLoading } = useFirebase();
    const { toast } = useToast();

    const shareRef = useMemoFirebase(() => {
        if (!shareId || !firestore) return null;
        return doc(firestore, 'shared_notes', shareId);
    }, [shareId, firestore]);

    const { data: sharedNote, isLoading: isNoteLoading, error: noteError } = useDoc<SharedNote>(shareRef);
    
    const handleSaveNote = async () => {
        if (!user || !firestore || !sharedNote) return;

        toast({ title: "Saving Note...", description: "A copy is being added to your notes." });

        try {
            // Find a subject to save to, or create one
            const subjectsCollRef = collection(firestore, 'users', user.uid, 'subjects');
            const querySnapshot = await getDoc(subjectsCollRef);

            let targetSubjectId: string;

            if (querySnapshot.size > 0) {
                targetSubjectId = querySnapshot.docs[0].id;
            } else {
                const newSubjectRef = await addDoc(subjectsCollRef, {
                    name: 'My Saved Notes',
                    description: 'Notes saved from shared links.',
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                });
                targetSubjectId = newSubjectRef.id;
            }
            
            const targetCollectionRef = collection(firestore, 'users', user.uid, 'subjects', targetSubjectId, sharedNote.originalItemType);
            
            let finalBlocks = sharedNote.blocks;
            if (!sharedNote.watermarkRemoved) {
                 finalBlocks = [
                    {
                        id: `watermark-${Date.now()}`,
                        type: 'text',
                        content: `<blockquote><p><em>Copied from a note shared by ${sharedNote.originalOwnerName}.</em></p></blockquote>`
                    },
                    ...sharedNote.blocks
                 ];
            }
            
            await addDoc(targetCollectionRef, {
                title: sharedNote.title,
                blocks: finalBlocks,
                isImportant: false,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                originalShareId: shareId
            });

            toast({ title: 'Note Saved!', description: `"${sharedNote.title}" has been added to your collection.`});
            router.push(`/dashboard/notes/${targetSubjectId}`);

        } catch (error) {
            console.error("Error saving note:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the note.'});
        }
    };

    if (isNoteLoading || isUserLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader className="animate-spin text-primary" /></div>;
    }

    if (noteError || !sharedNote) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-2xl font-bold">Note Not Found</h2>
                <p className="text-muted-foreground">This share link is either invalid or has expired.</p>
                <Button asChild variant="outline" className="mt-6"><Link href="/">Go to Homepage</Link></Button>
            </div>
        );
    }
    
    const content = user ? sharedNote.blocks[0]?.content : getPreviewContent(sharedNote.blocks);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-50 bg-background/50 backdrop-blur-lg border-b">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <Link href="/" aria-label="LiqAI Home"><Logo /></Link>
                    {user ? (
                        <Button onClick={handleSaveNote}><Save className="mr-2"/> Save to My Notes</Button>
                    ) : (
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" asChild><Link href="/login">Log In</Link></Button>
                            <Button variant="glow" asChild><Link href="/signup">Sign Up</Link></Button>
                        </div>
                    )}
                </div>
            </header>

            <main className="container mx-auto max-w-3xl py-8 px-4">
                <Card className="glass-pane overflow-hidden">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">{sharedNote.title}</CardTitle>
                        {!sharedNote.watermarkRemoved && (
                            <CardDescription>Shared by {sharedNote.originalOwnerName}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none w-full prose-p:text-muted-foreground prose-headings:text-foreground"
                            dangerouslySetInnerHTML={{ __html: content || '' }}
                        />
                        
                        {!user && (
                            <div className="relative mt-4">
                                <div className="absolute bottom-0 left-0 w-full h-3/4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                                <div className="relative flex flex-col items-center justify-center text-center p-8 backdrop-blur-sm rounded-lg">
                                    <Lock className="h-10 w-10 text-accent" />
                                    <h3 className="mt-4 text-xl font-bold">Content Locked</h3>
                                    <p className="text-muted-foreground mt-2">Log in or create a free account to view the full note and save it to your collection.</p>
                                    <div className="mt-6 flex gap-4">
                                        <Button asChild variant="outline"><Link href="/login"><LogIn className="mr-2"/>Log In</Link></Button>
                                        <Button asChild variant="glow"><Link href="/signup"><UserPlus className="mr-2"/>Sign Up for Free</Link></Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
