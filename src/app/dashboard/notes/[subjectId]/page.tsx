'use client';

import { useState, use, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, Plus, X, MoreVertical, Archive, Trash2, Notebook, FileText, Type } from 'lucide-react';
import { NoteEditor } from '@/components/note-editor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy, writeBatch, increment, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { WithId } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { FileUploader } from '@/components/file-uploader';
import { DocumentPreviewer } from '@/components/document-previewer';
import { v4 as uuidv4 } from 'uuid';

export type Note = WithId<{
  title: string;
  type: 'text' | 'document';
  content?: string;
  fileURL?: string;
  fileType?: string;
  fileSize?: number;
  originalFileName?: string;
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
        <CardHeader className="relative pb-4">
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
          <div onClick={() => onSelect(note)} className="cursor-pointer pr-8">
            <div className='flex items-center gap-2'>
              {note.type === 'text' ? <Type className="h-4 w-4 text-accent"/> : <FileText className="h-4 w-4 text-accent"/>}
              <CardTitle className="font-headline text-glow truncate pr-8">{note.title || 'Untitled Note'}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground pt-1 pl-6">Edited {lastEdited}</p>
          </div>
        </CardHeader>
        <CardContent onClick={() => onSelect(note)} className="cursor-pointer relative flex-1">
            {note.type === 'text' ? (
                <div 
                    className="prose prose-sm prose-invert max-w-none overflow-hidden text-ellipsis [&_p]:text-muted-foreground" 
                    dangerouslySetInnerHTML={{ __html: note.content || '' }}
                />
            ) : (
                <DocumentPreviewer note={note} isCardPreview={true} />
            )}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
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
                            <div className='flex items-center gap-2'>
                               {note.type === 'text' ? <Type className="h-5 w-5 text-accent"/> : <FileText className="h-5 w-5 text-accent"/>}
                               <CardTitle className="font-headline">{note.title}</CardTitle>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <Button variant="outline" onClick={() => onEdit(note)}><Edit className="mr-2"/> Edit</Button>
                             <Button variant="ghost" size="icon" onClick={onBack}><X /></Button>
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 max-w-none">
                         {note.type === 'text' ? (
                             <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: note.content || '' }} />
                         ) : (
                             <DocumentPreviewer note={note} />
                         )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}

const EditNoteView = ({ note, subjectId, onSave, onCancel }: { note: Partial<Note> | null; subjectId: string; onSave: (noteToSave: Partial<Note>) => void; onCancel: () => void; }) => {
    const [currentNote, setCurrentNote] = useState(note || { title: '', content: '', type: 'text' });

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
                            className="text-2xl font-headline bg-transparent border-0 focus:ring-0 w-full p-0"
                        />
                         <div className="flex items-center gap-2">
                             <Button variant="glow" onClick={handleSave}>Save</Button>
                             <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                         </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                       {currentNote.type === 'text' ? (
                            <NoteEditor 
                                value={currentNote.content || ''}
                                onChange={(content) => setCurrentNote({...currentNote, content})}
                            />
                       ) : (
                           <div className="p-6">
                                <p className="text-muted-foreground mb-4">To replace the document, please upload a new file. The current file will be replaced.</p>
                                <DocumentPreviewer note={currentNote as Note} />
                           </div>
                       )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}

const CreateNoteDialog = ({ open, onOpenChange, onSelectType }: { open: boolean; onOpenChange: (open: boolean) => void; onSelectType: (type: 'text' | 'document') => void; }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-pane">
            <DialogHeader>
                <DialogTitle className="font-headline">Create New Note</DialogTitle>
                <DialogDescription>What kind of note would you like to create?</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <Card onClick={() => onSelectType('text')} className="p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent transition-colors">
                    <Type className="h-12 w-12 text-accent" />
                    <h3 className="mt-4 font-bold">Text Note</h3>
                    <p className="text-sm text-muted-foreground mt-1">Write rich text with formatting.</p>
                </Card>
                <Card onClick={() => onSelectType('document')} className="p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-accent transition-colors">
                    <FileText className="h-12 w-12 text-accent" />
                    <h3 className="mt-4 font-bold">Document Note</h3>
                    <p className="text-sm text-muted-foreground mt-1">Upload a PDF, DOCX, or other file.</p>
                </Card>
            </div>
        </DialogContent>
    </Dialog>
);

const UploadDocumentDialog = ({ open, onOpenChange, subjectId, onUploadComplete }: { open: boolean; onOpenChange: (open: boolean) => void; subjectId: string; onUploadComplete: (note: Note) => void; }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const [isUploading, setIsUploading] = useState(false);
    const [title, setTitle] = useState('');

    const handleFileUpload = async (file: File) => {
        if (!user || !firestore || !storage) return;

        setIsUploading(true);
        setTitle(file.name);

        const noteId = uuidv4();
        const filePath = `notes/${user.uid}/${subjectId}/${noteId}/${file.name}`;
        const fileStorageRef = storageRef(storage, filePath);

        try {
            const snapshot = await uploadBytes(fileStorageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newNoteData = {
                userId: user.uid,
                subjectId,
                title: file.name,
                type: 'document' as const,
                fileURL: downloadURL,
                fileType: file.type,
                fileSize: file.size,
                originalFileName: file.name,
                lastEdited: serverTimestamp(),
                status: 'active' as const,
            };
            
            const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId);
            const noteDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId);
            
            const batch = writeBatch(firestore);
            batch.set(noteDocRef, newNoteData);
            batch.update(subjectDocRef, { noteCount: increment(1), lastEdited: serverTimestamp() });
            await batch.commit();

            onUploadComplete({ ...newNoteData, id: noteId });

        } catch (error) {
            console.error("Error uploading document:", error);
        } finally {
            setIsUploading(false);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-pane">
                 <DialogHeader>
                    <DialogTitle className="font-headline">Upload Document</DialogTitle>
                    <DialogDescription>Select a document to create a new note.</DialogDescription>
                </DialogHeader>
                {isUploading ? (
                     <div className="flex flex-col items-center justify-center p-8">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="h-12 w-12 border-4 border-t-transparent border-primary rounded-full"
                        />
                        <p className="mt-4 text-muted-foreground">Uploading "{title}"...</p>
                    </div>
                ) : (
                    <FileUploader onFileUpload={handleFileUpload} />
                )}
            </DialogContent>
        </Dialog>
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
    const [isCreating, setIsCreating] = useState<'text' | 'document' | null>(null);
    const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false);
    
    const activeNotes = useMemo(() => notes?.filter(note => note.status === 'active') || [], [notes]);
    
    const handleSelectNote = (note: Note) => {
        setSelectedNote(note);
        setIsEditing(false);
        setIsCreating(null);
    }
    
    const handleBack = () => setSelectedNote(null);
    const handleEdit = () => setIsEditing(true);

    const handleOpenCreateDialog = () => setIsCreateTypeDialogOpen(true);

    const handleSelectCreateType = (type: 'text' | 'document') => {
        setIsCreateTypeDialogOpen(false);
        if (type === 'text') {
            setIsEditing(true);
            setSelectedNote(null); // Clear selected note to indicate creation
            setIsCreating('text');
        } else {
            setIsCreating('document');
        }
    };
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        setIsCreating(null);
        if (!selectedNote?.id) {
           setSelectedNote(null);
        }
    }
    
    const handleSaveNote = async (noteToSave: Partial<Note>) => {
        if (!user || !firestore || !subjectDocRef) return;
        
        const noteData = { ...noteToSave, userId: user.uid, subjectId };

        const isNewNote = !noteToSave.id;

        if (isNewNote) {
            const noteCollRef = collection(firestore, subjectDocRef.path, 'notes');
            const newDocRef = await addDoc(noteCollRef, noteData);
            await updateDoc(subjectDocRef, { noteCount: increment(1), lastEdited: serverTimestamp() });
            setSelectedNote({ ...noteData, id: newDocRef.id } as Note);
        } else {
            const noteDocRef = doc(firestore, subjectDocRef.path, 'notes', noteToSave.id!);
            await updateDoc(noteDocRef, noteData);
            await updateDoc(subjectDocRef, { lastEdited: serverTimestamp() });
            setSelectedNote(noteData as Note);
        }
        
        setIsEditing(false);
        setIsCreating(null);
    }

    const handleDeleteNote = useCallback(async (noteId: string) => {
        if (!firestore || !user || !subjectDocRef) return;
        
        const noteDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId);
        
        // If it's a document note, delete from storage first
        const noteToDelete = notes?.find(n => n.id === noteId);
        if (noteToDelete?.type === 'document' && noteToDelete.fileURL) {
             try {
                const fileStorageRef = storageRef(firestore.app, noteToDelete.fileURL);
                await deleteObject(fileStorageRef);
            } catch (error) {
                console.error("Error deleting file from storage:", error);
                // Decide if you want to proceed with DB deletion even if storage deletion fails
            }
        }

        const batch = writeBatch(firestore);
        batch.delete(noteDocRef);
        batch.update(subjectDocRef, { noteCount: increment(-1), lastEdited: serverTimestamp() });

        await batch.commit();
        
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
        }
    }, [firestore, user, subjectId, subjectDocRef, notes, selectedNote?.id]);

    const handleArchiveNote = async (noteId: string) => {
        if (!firestore || !user || !subjectDocRef) return;
        const noteDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId);
        await updateDoc(noteDocRef, { status: 'archived', lastEdited: serverTimestamp() });
        await updateDoc(subjectDocRef, { lastEdited: serverTimestamp() });

        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
        }
    };
    
    const handleUploadComplete = (newNote: Note) => {
        setIsCreating(null);
        handleSelectNote(newNote);
    }


  return (
    <div className="p-0">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/notes"><ArrowLeft /></Link>
                </Button>
                <h1 className="text-3xl font-headline">{subject?.title || 'Notes'}</h1>
            </div>
            <Button variant="glow" onClick={handleOpenCreateDialog}><Plus className="mr-2"/> Add Note</Button>
        </div>

        {isLoadingNotes && <p>Loading notes...</p>}
        
        {!isLoadingNotes && activeNotes.length === 0 && !isCreating && (
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
            
            {isEditing && (
                <EditNoteView
                    key={`edit-${selectedNote?.id || 'new'}`}
                    note={isCreating === 'text' ? { title: '', type: 'text', content: '' } : selectedNote}
                    subjectId={subjectId}
                    onSave={handleSaveNote}
                    onCancel={handleCancelEdit}
                />
            )}

        </AnimatePresence>

        <CreateNoteDialog
            open={isCreateTypeDialogOpen}
            onOpenChange={setIsCreateTypeDialogOpen}
            onSelectType={handleSelectCreateType}
        />
        
        <UploadDocumentDialog
            open={isCreating === 'document'}
            onOpenChange={(open) => !open && setIsCreating(null)}
            subjectId={subjectId}
            onUploadComplete={handleUploadComplete}
        />
    </div>
  );
}

    