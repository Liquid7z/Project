'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, File, Loader, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// Mock data
const mockNote = {
    id: 'n1',
    title: 'The Last Sunset',
    content: `<p>The sky bled orange and purple as the last sun of the year dipped below the horizon of Neo-Kyoto. From my high-rise hab-unit, the city looked like a circuit board of pulsing light. It was beautiful, in a sterile, manufactured kind of way.</p><p>Down below, the crowds would be swarming, a river of humanity flowing towards the countdown plaza. But up here, it was just me and the quiet hum of the climate-control unit. Another year gone. Another year alone.</p>`,
    documents: [
        { name: 'Research_Notes.pdf', url: '#', type: 'PDF' },
        { name: 'Character_Sheet.docx', url: '#', type: 'DOCX' },
    ],
    lastUpdated: new Date(Date.now() - 3600000),
};
const mockSubject = { id: '1', name: 'Creative Writing', description: 'Drafts of short stories and poems.' };


export default function NotePreviewPage() {
    const params = useParams();
    const subjectId = params.subjectId as string;
    const noteId = params.noteId as string;
    const router = useRouter();

    // In a real app, use useDoc for the note and subject
    const note = mockNote;
    const subject = mockSubject;
    const isLoading = false;
    const error = null;
    
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your note...</p>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="mt-4 font-semibold">Failed to load note</p>
                <p className="text-sm text-muted-foreground">{error.toString()}</p>
                <Button variant="outline" size="sm" asChild className="mt-4">
                   <Link href={`/dashboard/notes/${subjectId}`}>Return to Subject</Link>
                </Button>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">Note not found</p>
                 <Button variant="outline" size="sm" asChild className="mt-4">
                   <Link href={`/dashboard/notes/${subjectId}`}>Return to Subject</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {heroImage && (
                <div className="h-64 w-full relative rounded-lg overflow-hidden">
                    <Image src={heroImage.imageUrl} alt={heroImage.description} layout="fill" objectFit="cover" className="opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
            )}
            
            <div className="flex items-center justify-between -mt-24 relative z-10 px-8">
                 <Link href={`/dashboard/notes/${subjectId}`}>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <Button variant="glow" onClick={() => router.push(`/dashboard/notes/${subjectId}/${noteId}/edit`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Note
                </Button>
            </div>
            
            <div className="space-y-6 px-4 md:px-8">
                <Card className="glass-pane overflow-hidden">
                    <CardHeader>
                        <CardTitle className="font-headline text-4xl">{note.title}</CardTitle>
                        <CardDescription>From subject: <Link href={`/dashboard/notes/${subjectId}`} className="text-accent hover:underline">{subject.name}</Link></CardDescription>
                    </CardHeader>
                </Card>

                <Card className="glass-pane">
                    <CardContent className="p-6">
                        <h3 className="font-headline text-xl mb-4 text-accent">Content</h3>
                         <div
                            className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground"
                            dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                    </CardContent>
                </Card>

                {note.documents && note.documents.length > 0 && (
                     <Card className="glass-pane">
                        <CardHeader>
                             <CardTitle className="font-headline text-xl text-accent">Attached Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {note.documents.map((doc, index) => (
                                    <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" className="block group">
                                        <div className="flex items-center gap-4 p-4 rounded-md bg-background/50 hover:bg-accent/10 transition-colors">
                                            <File className="h-8 w-8 text-primary" />
                                            <div>
                                                <p className="font-semibold text-sm truncate">{doc.name}</p>
                                                <Badge variant="secondary">{doc.type}</Badge>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}
