'use client';

import { use, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteEditor } from '@/components/note-editor';
import { useDebouncedCallback } from 'use-debounce';

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

export default function NoteEditPage({ params: paramsPromise }: { params: Promise<{ noteId: string, subjectId: string }> }) {
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

    const [title, setTitle] = useState('');
    const [content, setContent] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    
    // Ref to track if initial load is done to prevent auto-saving on mount
    const isInitialLoadDone = useRef(false);

    useEffect(() => {
        if (note && !isInitialLoadDone.current) {
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
            // Use a timeout to ensure the editor has time to initialize with content
            // before we mark the initial load as done.
            setTimeout(() => {
              isInitialLoadDone.current = true;
            }, 500);
        }
    }, [note]);

    const saveNote = useCallback(async (noteDataToSave: { title: string; content: any }) => {
        if (!noteDocRef) return;
        
        setIsSaving(true);
        const finalNoteData = {
            ...noteDataToSave,
            lastEdited: serverTimestamp(),
        };

        try {
            // Using non-blocking update for better UX
            updateDocumentNonBlocking(noteDocRef, finalNoteData);
            setLastSaved(new Date());
        } catch (error) {
            console.error("Failed to save note:", error);
        } finally {
            // Use a small delay to prevent the "Saving..." flicker
            setTimeout(() => setIsSaving(false), 500);
        }
    }, [noteDocRef]);

    const debouncedSave = useDebouncedCallback(() => {
      // Don't save if initial load isn't finished, or content isn't set
      if (!isInitialLoadDone.current || content === null || !title) {
        return;
      }
      saveNote({ title, content });
    }, 1500); // Auto-save after 1.5 seconds of inactivity

    // Trigger debounced save when title or content changes
    useEffect(() => {
      if (isInitialLoadDone.current) {
        debouncedSave();
      }
    }, [title, content, debouncedSave]);


    const handleManualSaveAndClose = async () => {
         if (content === null) return;
         await saveNote({ title, content });
         router.push(`/dashboard/notes/${subjectId}`);
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
            const isJustSaved = new Date().getTime() - lastSaved.getTime() < 3000;
            return <span className={`text-sm text-muted-foreground transition-opacity ${isJustSaved ? 'opacity-100' : 'opacity-0'}`}>Saved</span>;
        }
        return <span className="text-sm text-muted-foreground h-5"></span>;
    }

    if (isLoadingNote || isLoadingSubject) {
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
                <Button asChild variant="link"><Link href={`/dashboard/notes/${subjectId}`}>Go back to subject</Link></Button>
            </div>
        );
    }
    
    return (
        <div className="h-[calc(100vh-1rem)] md:h-screen flex flex-col">
             <header className="flex justify-between items-center p-4 border-b">
                <div className="flex items-center gap-2">
                     <Link href="/dashboard/notes" className="text-muted-foreground hover:text-foreground text-sm">Subjects</Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {isLoadingSubject ? <Skeleton className="h-6 w-24" /> : subject && (
                        <Link href={`/dashboard/notes/${subjectId}`} className="text-muted-foreground hover:text-foreground text-sm">{subject.name}</Link>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {getSavingStatus()}
                    <Button variant="glow" onClick={handleManualSaveAndClose} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2"/>}
                        Save & Close
                    </Button>
                </div>
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

    