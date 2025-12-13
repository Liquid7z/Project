'use client';

import { useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Search, MoreVertical, Archive, Trash2, Edit, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentPreviewer } from '@/components/document-previewer';
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import DocumentBlock from '@/components/document-block';

type Note = WithId<{
  title: string;
  content?: any; 
  lastEdited: any;
  status: 'active' | 'archived';
  userId: string;
  subjectId: string;
}>;

type Subject = WithId<{
    name: string;
}>;


const NoteContentPreview = ({ content }: { content: any }) => {
    const editor = useEditor({
        editable: false,
        extensions: [StarterKit, Image, DocumentBlock],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
            },
        },
    }, [content]);

    return <EditorContent editor={editor} />;
}

const NotePreviewCard = ({ note }: { note: Note }) => {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const lastEdited = note.lastEdited?.toDate ? formatDistanceToNow(note.lastEdited.toDate(), { addSuffix: true }) : 'just now';

    const handleDelete = async () => {
        if (!user || !firestore) return;
        const noteDocRef = doc(firestore, 'users', user.uid, 'subjects', note.subjectId, 'notes', note.id);
        await deleteDocumentNonBlocking(noteDocRef);
        setIsDeleteDialogOpen(false);
    };

    const handleArchive = async () => {
         if (!user || !firestore) return;
        const noteDocRef = doc(firestore, 'users', user.uid, 'subjects', note.subjectId, 'notes', note.id);
        await updateDocumentNonBlocking(noteDocRef, { status: 'archived', lastEdited: serverTimestamp() });
    };

    const contentForPreview = useMemo(() => {
        if (!note.content) return '';
        try {
            const parsed = typeof note.content === 'string' ? JSON.parse(note.content) : note.content;
            return parsed;
        } catch {
            return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: note.content }] }] };
        }
    }, [note.content]);

    return (
        <>
            <motion.div
                layoutId={`note-card-${note.id}`}
                whileHover={{ y: -5 }}
                className="h-full"
            >
                <Card className="group glass-pane transition-all hover:border-accent overflow-hidden h-full flex flex-col">
                    <CardHeader className="relative pb-4">
                        <div className="absolute top-2 right-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glass-pane">
                                     <DropdownMenuItem onClick={() => router.push(`/dashboard/notes/${note.subjectId}/${note.id}/edit`)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleArchive}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        <span>Archive</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <Link href={`/dashboard/notes/${note.subjectId}/${note.id}`} className="cursor-pointer pr-8">
                            <CardTitle className="font-headline text-glow truncate pr-8">{note.title || 'Untitled Note'}</CardTitle>
                             <p className="text-xs text-muted-foreground pt-1">Edited {lastEdited}</p>
                        </Link>
                    </CardHeader>
                    <Link href={`/dashboard/notes/${note.subjectId}/${note.id}`} className="flex-1 cursor-pointer">
                        <CardContent className="relative h-full">
                           <div className="prose prose-sm prose-invert max-w-none h-24 overflow-hidden text-ellipsis [&>p]:text-muted-foreground">
                                <NoteContentPreview content={contentForPreview} />
                           </div>
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
                        </CardContent>
                    </Link>
                </Card>
            </motion.div>
             <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Are you sure?</DialogTitle>
                        <DialogDescription>
                           This will permanently delete the note titled "{note.title}". This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


export default function NotesDashboardPage({ params }: { params: { subjectId: string } }) {
    const { subjectId } = params;
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    
    const notesRef = useMemoFirebase(() => 
        user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null, 
        [firestore, user, subjectId]
    );

    const subjectDocRef = useMemoFirebase(() =>
        user ? doc(firestore, 'users', user.uid, 'subjects', subjectId) : null,
        [firestore, user, subjectId]
    );

    const notesQuery = useMemoFirebase(() => 
        notesRef ? query(notesRef, orderBy('lastEdited', 'desc')) : null, 
        [notesRef]
    );

    const { data: notes, isLoading: isLoadingNotes } = useCollection<Note>(notesQuery);
    const { data: subject, isLoading: isLoadingSubject } = useDoc<Subject>(subjectDocRef);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const handleCreateNote = async () => {
        if (!user || !notesRef) return;

        const newNote = {
            userId: user.uid,
            subjectId: subjectId,
            title: "Untitled Note",
            content: "", 
            lastEdited: serverTimestamp(),
            status: 'active' as const,
        };

        const newDocRef = await addDocumentNonBlocking(notesRef, newNote);
        if(newDocRef?.id) {
            router.push(`/dashboard/notes/${subjectId}/${newDocRef.id}/edit`);
        }
    };


    const filteredAndSortedNotes = useMemo(() => {
        if (!notes) return [];
        return notes
            .filter(note => note.status === 'active')
            .filter(note => 
                note.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const timeA = a.lastEdited?.toDate ? a.lastEdited.toDate().getTime() : 0;
                const timeB = b.lastEdited?.toDate ? b.lastEdited.toDate().getTime() : 0;
                if (sortBy === 'newest') {
                    return timeB - timeA;
                }
                if (sortBy === 'oldest') {
                    return timeA - timeB;
                }
                if (sortBy === 'title-asc') {
                    return a.title.localeCompare(b.title);
                }
                if (sortBy === 'title-desc') {
                    return b.title.localeCompare(a.title);
                }
                return 0;
            });
    }, [notes, searchTerm, sortBy]);

    return (
        <div className="p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/notes" className="text-muted-foreground hover:text-foreground">Subjects</Link>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {isLoadingSubject ? <Skeleton className="h-8 w-32" /> : (
                        <h1 className="text-3xl font-headline">{subject?.name || 'Subject'}</h1>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search notes..." 
                            className="pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Last Edited (Newest)</SelectItem>
                            <SelectItem value="oldest">Last Edited (Oldest)</SelectItem>
                            <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                             <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="glow" onClick={handleCreateNote} className="w-full sm:w-auto"><Plus className="mr-2"/> New Note</Button>
                </div>
            </div>
            
            {isLoadingNotes && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="glass-pane">
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                        </Card>
                    ))}
                 </div>
            )}

            {!isLoadingNotes && filteredAndSortedNotes.length === 0 && (
                 <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Notes Yet</h3>
                    <p className="mt-1 text-sm">{searchTerm ? 'No notes match your search.' : 'Click "New Note" to get started.'}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedNotes.map((note, index) => (
                    <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="h-full"
                    >
                        <NotePreviewCard note={note} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

    