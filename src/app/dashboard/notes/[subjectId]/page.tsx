'use client';

import { useState, use, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, Plus, Save, X, MoreVertical, Archive, Trash2, Notebook } from 'lucide-react';
import { NoteEditor } from '@/components/note-editor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';

type Note = WithId<{
  title: string;
  content: string; 
  lastEdited: any; // Firestore timestamp
  status: 'active' | 'archived';
  userId: string;
  subjectId: string;
}>;

const NotePreviewCard = ({ note, onSelect, onArchive, onDelete }: { note: Note; onSelect: (note: Note) => void; onArchive: (id: string) => void; onDelete: (id: string) => void; }) => {
  const lastEdited = note.lastEdited?.toDate ? formatDistanceToNow(note.lastEdited.toDate(), { addSuffix: true }) : 'just now';

  return (
    <motion.div
      layoutId={`note-card-${note.id}`}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="group glass-pane transition-all hover:border-accent overflow-hidden h-full flex flex-col">
        <CardHeader className="relative">
           <div className="absolute top-2 right-2">
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-pane">
                      <DropdownMenuItem onClick={() => onArchive(note.id)}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>Archive</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
          <div onClick={() => onSelect(note)} className="cursor-pointer">
            <CardTitle className="font-headline text-glow truncate pr-8">{note.title || 'Untitled Note'}</CardTitle>
            <p className="text-xs text-muted-foreground pt-1">Edited {lastEdited}</p>
          </div>
        </CardHeader>
        <CardContent onClick={() => onSelect(note)} className="cursor-pointer relative flex-1">
            <div 
                className="prose prose-sm prose-invert max-w-none overflow-hidden text-ellipsis [&_p]:text-muted-foreground" 
                dangerouslySetInnerHTML={{ __html: note.content }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const FullNoteView = ({ note, onBack, onEdit }: { note: Note; onBack: () => void; onEdit: (note: Note) => void; }) => {
    return (
        <motion.div 
            layoutId={`note-card-${note.id}`}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 md:p-8 lg:p-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="relative h-full w-full">
                <Card className="glass-pane h-full w-full flex flex-col">
                     <CardHeader className="flex-row items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft /></Button>
                            <CardTitle className="font-headline">{note.title}</CardTitle>
                         </div>
                         <div className="flex items-center gap-2">
                             <Button variant="outline" onClick={() => onEdit(note)}><Edit className="mr-2"/> Edit</Button>
                             <Button variant="ghost" size="icon" onClick={onBack}><X /></Button>
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none">
                         <div dangerouslySetInnerHTML={{ __html: note.content }} />
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}

const EditNoteView = ({ note, subjectId, onSave, onCancel }: { note: Partial<Note> | null; subjectId: string; onSave: (noteToSave: Partial<Note>) => void; onCancel: () => void; }) => {
    const [currentNote, setCurrentNote] = useState(
        note || { title: '', content: '' }
    );

    const handleSave = () => {
        onSave({
            ...currentNote,
            lastEdited: serverTimestamp(),
            status: 'active',
            subjectId: subjectId,
        });
    }

    return (
         <motion.div 
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 md:p-8 lg:p-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="relative h-full w-full">
                <Card className="glass-pane h-full w-full flex flex-col">
                    <CardHeader className="flex-row items-center justify-between">
                        <input 
                            type="text"
                            value={currentNote.title}
                            onChange={(e) => setCurrentNote({...currentNote, title: e.target.value})}
                            placeholder="Note Title"
                            className="text-2xl font-headline bg-transparent border-0 focus:ring-0 w-full"
                        />
                         <div className="flex items-center gap-2">
                             <Button variant="glow" onClick={handleSave}><Save className="mr-2"/> Save</Button>
                             <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <NoteEditor 
                            value={currentNote.content || ''}
                            onChange={(content) => setCurrentNote({...currentNote, content})}
                        />
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}


export default function SubjectNotesPage({ params: paramsPromise }: { params: Promise<{ subjectId: string }> }) {
    const params = use(paramsPromise);
    const { subjectId } = params;
    
    const { user } = useUser();
    const firestore = useFirestore();

    const subjectDocRef = useMemoFirebase(() =>
        user ? doc(firestore, 'users', user.uid, 'subjects', subjectId) : null,
        [firestore, user, subjectId]
    );
    const { data: subject } = useDoc<{title: string}>(subjectDocRef);

    const notesRef = useMemoFirebase(() => 
        user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null,
        [firestore, user, subjectId]
    );

    const notesQuery = useMemoFirebase(() => 
        notesRef ? query(notesRef, orderBy('lastEdited', 'desc')) : null,
        [notesRef]
    );

    const { data: notes, isLoading: isLoadingNotes } = useCollection<Note>(notesQuery);

    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    const activeNotes = useMemo(() => notes?.filter(note => note.status === 'active') || [], [notes]);

    const handleSelectNote = (note: Note) => {
        setSelectedNote(note);
        setIsEditing(false);
        setIsCreating(false);
    }
    
    const handleBack = () => {
        setSelectedNote(null);
    }
    
    const handleEdit = () => {
        setIsEditing(true);
    }

    const handleCreate = () => {
        setIsCreating(true);
        setIsEditing(false);
        setSelectedNote(null);
    }
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        setIsCreating(false);
        if (!selectedNote?.id) {
           setSelectedNote(null);
        }
    }
    
    const handleSaveNote = async (noteToSave: Partial<Note>) => {
        if (!user || !notesRef) return;
        
        const noteData = {
            ...noteToSave,
            userId: user.uid,
        };

        if (noteToSave.id) {
            const noteDocRef = doc(notesRef, noteToSave.id);
            await setDocumentNonBlocking(noteDocRef, noteData, { merge: true });
        } else {
            const newDocRef = await addDocumentNonBlocking(notesRef, noteData);
            noteToSave.id = newDocRef.id;
        }

        setIsEditing(false);
        setIsCreating(false);
        setSelectedNote(noteToSave as Note);
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!notesRef) return;
        const noteDocRef = doc(notesRef, noteId);
        await deleteDocumentNonBlocking(noteDocRef);
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
        }
    };

    const handleArchiveNote = async (noteId: string) => {
        if (!notesRef) return;
        const noteDocRef = doc(notesRef, noteId);
        await setDocumentNonBlocking(noteDocRef, { status: 'archived' }, { merge: true });
    };

  return (
    <div className="p-0">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-headline">{subject?.title || 'Notes'}</h1>
            <Button variant="glow" onClick={handleCreate}><Plus className="mr-2"/> Add Note</Button>
        </div>

        {isLoadingNotes && <p>Loading notes...</p>}
        
        {!isLoadingNotes && activeNotes.length === 0 && (
            <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                <Notebook className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">No Notes in this Subject</h3>
                <p className="mt-1 text-sm">Click "Add Note" to create your first one.</p>
            </div>
        )}

      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeNotes.map((note, index) => (
                <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="h-full"
                >
                    <NotePreviewCard 
                        note={note} 
                        onSelect={handleSelectNote}
                        onArchive={handleArchiveNote}
                        onDelete={handleDeleteNote}
                    />
                </motion.div>
            ))}
        </div>
        
        {selectedNote && !isEditing && (
            <FullNoteView 
                key={`view-${selectedNote.id}`}
                note={selectedNote}
                onBack={handleBack}
                onEdit={handleEdit}
            />
        )}
        
        {(isEditing || isCreating) && (
            <EditNoteView
                key={`edit-${selectedNote?.id || 'new'}`}
                note={isCreating ? null : selectedNote}
                subjectId={subjectId}
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
            />
        )}

      </AnimatePresence>
    </div>
  );
}
