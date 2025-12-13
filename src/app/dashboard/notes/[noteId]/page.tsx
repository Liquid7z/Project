'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import DocumentBlock from '@/components/document-block';

type Note = WithId<{
  title: string;
  content: any; // JSON from TipTap
  lastEdited: any;
  status: 'active' | 'archived';
  userId: string;
}>;

const NoteViewer = ({ content }: { content: any }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ document: false }),
            Document,
            Paragraph,
            Text,
            Image,
            DocumentBlock,
        ],
        content: content,
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none p-4 h-full',
            },
        },
    });

    if (!editor) {
        return <Skeleton className="w-full h-96" />;
    }

    return <EditorContent editor={editor} />;
};

export default function NoteViewPage({ params: paramsPromise }: { params: Promise<{ noteId: string }> }) {
    const params = use(paramsPromise);
    const { noteId } = params;
    const router = useRouter();

    const { user } = useUser();
    const firestore = useFirestore();

    const noteDocRef = useMemoFirebase(() => 
        user ? doc(firestore, 'users', user.uid, 'notes', noteId) : null,
        [firestore, user, noteId]
    );

    const { data: note, isLoading: isLoadingNote } = useDoc<Note>(noteDocRef);

    const content = useMemo(() => {
        if (!note?.content) return '';
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
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/dashboard/notes"><ArrowLeft /></Link>
                    </Button>
                    <h1 className="text-3xl font-headline">{note?.title || <Skeleton className="h-8 w-64" />}</h1>
                </div>
                <Button variant="glow" onClick={() => router.push(`/dashboard/notes/${noteId}/edit`)}><Edit className="mr-2"/> Edit Note</Button>
            </header>
            <main className="flex-1 overflow-y-auto">
                 {isLoadingNote ? (
                    <div className="p-4 space-y-4">
                        <Skeleton className="h-96 w-full" />
                    </div>
                ) : note ? (
                    <NoteViewer content={content} />
                ) : (
                    <div className="p-4 text-center text-muted-foreground">Note not found.</div>
                )}
            </main>
        </div>
    );
}
