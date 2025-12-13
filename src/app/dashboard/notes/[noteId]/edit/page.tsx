'use client';

import { use, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteEditor } from '@/components/note-editor';
import { useDebounce } from 'use-debounce';

type Note = WithId<{
  title: string;
  content: any; // JSON from TipTap
  lastEdited: any;
  status: 'active' | 'archived';
  userId: string;
}>;

export default function NoteEditPage({ params: paramsPromise }: { params: Promise<{ noteId: string }> }) {
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

    const [title, setTitle] = useState('');
    const [content, setContent] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const [debouncedContent] = useDebounce(content, 1000);
    const [debouncedTitle] = useDebounce(title, 1000);
    
    // Ref to track if initial load is done
    const isInitialLoadDone = useRef(false);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            if (note.content) {
                try {
                    const parsedContent = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
                    setContent(parsedContent);
                } catch(e) {
                     setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: note.content }] }] });
                }
            } else {
                setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
            }
             if (note.lastEdited?.toDate) {
                setLastSaved(note.lastEdited.toDate());
            }
            isInitialLoadDone.current = true;
        }
    }, [note]);

    const saveNote = useCallback(async (noteDataToSave: { title: string; content: string }) => {
        if (!noteDocRef) return;
        
        setIsSaving(true);
        const finalNoteData = {
            ...noteDataToSave,
            lastEdited: serverTimestamp(),
        };

        try {
            await updateDocumentNonBlocking(noteDocRef, finalNoteData);
            setLastSaved(new Date());
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            setIsSaving(false);
        }
    }, [noteDocRef]);

    useEffect(() => {
        // Prevent saving on initial load
        if (!isInitialLoadDone.current || content === null) {
            return;
        }
        
        const contentChanged = JSON.stringify(debouncedContent) !== JSON.stringify(note?.content ? (typeof note.content === 'string' ? JSON.parse(note.content) : note.content) : '');
        const titleChanged = debouncedTitle !== note?.title;

        if (contentChanged || titleChanged) {
            saveNote({ title: debouncedTitle, content: JSON.stringify(debouncedContent) });
        }
    }, [debouncedContent, debouncedTitle, note, saveNote, content]);


    const handleManualSave = () => {
         if (content === null) return;
         saveNote({ title, content: JSON.stringify(content) });
         router.push(`/dashboard/notes/${noteId}`);
    }

    const getSavingStatus = () => {
        if (isSaving) {
            return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Saving...</span>
                </div>
            );
        }
        if (lastSaved) {
            return <span className="text-sm text-muted-foreground">Last saved: {lastSaved.toLocaleTimeString()}</span>;
        }
        return null;
    }

    if (isLoadingNote) {
        return (
            <div className="h-full flex flex-col p-4 space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="flex-1 w-full" />
            </div>
        );
    }
    
    if (!note) {
         return (
            <div className="p-4 text-center text-muted-foreground">
                <p>Note not found. It might have been deleted.</p>
                <Button asChild variant="link"><Link href="/dashboard/notes">Go back to notes</Link></Button>
            </div>
        );
    }
    
    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
             <header className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`/dashboard/notes/${noteId}`}><ArrowLeft /></Link>
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-headline">{title || "Untitled"}</h1>
                        {getSavingStatus()}
                    </div>
                </div>
                <Button variant="glow" onClick={handleManualSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2"/>}
                    Save & Close
                </Button>
            </header>
            <main className="flex-1 overflow-y-auto">
                 {content !== null && (
                    <NoteEditor 
                        value={content}
                        onChange={setContent}
                        title={title}
                        onTitleChange={setTitle}
                    />
                 )}
            </main>
        </div>
    );
}
