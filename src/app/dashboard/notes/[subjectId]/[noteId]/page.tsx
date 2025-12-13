'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import DocumentBlock from '@/components/document-block';
import PdfBlock from '@/components/pdf-block';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

type Note = WithId<{
  title: string;
  content: any; // JSON from TipTap
  lastEdited: any;
  status: 'active' | 'archived';
  userId: string;
  subjectId: string;
}>;

type Subject = WithId<{
  name: string;
}>;


const NoteViewer = ({ content }: { content: any }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            DocumentBlock,
            PdfBlock,
        ],
        content: content,
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4 h-full',
            },
        },
    }, [content]);

    if (!editor) {
        return <Skeleton className="w-full h-96" />;
    }

    return <EditorContent editor={editor} />;
};

export default function NoteViewPage({ params: paramsPromise }: { params: Promise<{ noteId: string, subjectId: string }> }) {
    const params = use(paramsPromise);
    const { noteId, subjectId } = params;
    const router = useRouter();

    const { user } = useUser();
    const firestore = useFirestore();

    const noteDocRef = useMemoFirebase(() => 
        user ? doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId) : null,
        [firestore, user, subjectId, noteId]
    );

    const subjectDocRef = useMemoFirebase(() => 
        user ? doc(firestore, 'users', user.uid, 'subjects', subjectId) : null,
        [firestore, user, subjectId]
    );

    const { data: note, isLoading: isLoadingNote } = useDoc<Note>(noteDocRef);
    const { data: subject, isLoading: isLoadingSubject } = useDoc<Subject>(subjectDocRef);


    const content = useMemo(() => {
        if (!note?.content) return null; // Return null if no content
        if (typeof note.content === 'string') {
            try {
                return JSON.parse(note.content);
            } catch (e) {
                // Handle case where content is plain text for legacy notes
                return {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: note.content }],
                        },
                    ],
                };
            }
        }
        return note.content;
    }, [note?.content]);

    return (
        <div className="h-full flex flex-col">
             <header className="flex justify-between items-center mb-6 p-4 border-b">
                <div className="flex items-center gap-2 text-sm md:text-base">
                    <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/dashboard/notes/${subjectId}`}><ArrowLeft /></Link>
                    </Button>
                    <Link href="/dashboard/notes" className="text-muted-foreground hover:text-foreground">Subjects</Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {isLoadingSubject ? <Skeleton className="h-6 w-24" /> : subject && (
                        <Link href={`/dashboard/notes/${subjectId}`} className="text-muted-foreground hover:text-foreground">{subject.name}</Link>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <h1 className="text-lg md:text-xl font-headline">{note?.title || <Skeleton className="h-8 w-48" />}</h1>
                </div>
                <Button variant="glow" onClick={() => router.push(`/dashboard/notes/${subjectId}/${noteId}/edit`)}><Edit className="mr-2"/> Edit Note</Button>
            </header>
            <main className="flex-1 overflow-y-auto">
                 {isLoadingNote ? (
                    <div className="p-4 space-y-4">
                        <Skeleton className="h-96 w-full" />
                    </div>
                ) : note && content ? ( // Check for content before rendering
                    <NoteViewer content={content} />
                ) : (
                    <div className="p-4 text-center text-muted-foreground">
                        {note ? 'This note is empty.' : 'Note not found.'}
                    </div>
                )}
            </main>
        </div>
    );
}
