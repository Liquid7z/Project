'use client';

import { useState, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, Plus, Save, X, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { NoteEditor } from '@/components/note-editor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Note = {
  id: number;
  title: string;
  content: string; // This would be structured content in a real app (e.g., JSON)
  lastEdited: string;
  status: 'active' | 'archived';
};

const mockNotesData: Note[] = [
  { 
    id: 1, 
    title: 'Quantum Mechanics Basics', 
    content: '<h1>Quantum Mechanics</h1><p>Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.</p><p>Key concepts include quantization of energy, wave-particle duality, and the uncertainty principle.</p>', 
    lastEdited: '2 hours ago' ,
    status: 'active'
  },
  { 
    id: 2, 
    title: 'The Periodic Table', 
    content: '<h2>The Periodic Table of Elements</h2><p>The periodic table is a tabular arrangement of the chemical elements, ordered by their atomic number, electron configuration, and recurring chemical properties.</p>', 
    lastEdited: 'Yesterday',
    status: 'active'
  },
  { 
    id: 3, 
    title: 'World War II Summary', 
    content: '<h3>A Brief Overview of World War II</h3><p>World War II was a global war that lasted from 1939 to 1945. It involved the vast majority of the world\'s countries—including all of the great powers—forming two opposing military alliances: the Allies and the Axis.</p>', 
    lastEdited: '3 days ago',
    status: 'active'
  },
];


const NotePreviewCard = ({ note, onSelect, onArchive, onDelete }: { note: Note; onSelect: (note: Note) => void; onArchive: (id: number) => void; onDelete: (id: number) => void; }) => {
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
            <CardTitle className="font-headline text-glow truncate pr-8">{note.title}</CardTitle>
            <p className="text-xs text-muted-foreground pt-1">Edited {note.lastEdited}</p>
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

const EditNoteView = ({ note, onSave, onCancel }: { note: Note | null; onSave: (note: Note) => void; onCancel: () => void; }) => {
    const [currentNote, setCurrentNote] = useState<Omit<Note, 'status'>>(
        note || { id: Date.now(), title: '', content: '', lastEdited: new Date().toISOString() }
    );

    const handleSave = () => {
        onSave({
            ...currentNote,
            lastEdited: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: note?.status || 'active',
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
                            value={currentNote.content}
                            onChange={(content) => setCurrentNote({...currentNote, content})}
                        />
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    )
}


export default function SubjectNotesPage({ params }: { params: Promise<{ subjectId: string }> }) {
    const { subjectId } = use(params);
    const [notes, setNotes] = useState<Note[]>(mockNotesData);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // In a real app, you would filter notes based on `subjectId`
    const subjectTitle = (subjectId || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const activeNotes = notes.filter(note => note.status === 'active');

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
    
    const handleSaveNote = (noteToSave: Note) => {
        const exists = notes.some(n => n.id === noteToSave.id);
        if (exists) {
            setNotes(notes.map(n => n.id === noteToSave.id ? noteToSave : n));
        } else {
            setNotes([noteToSave, ...notes]);
        }
        setIsEditing(false);
        setIsCreating(false);
        setSelectedNote(noteToSave);
    }

    const handleDeleteNote = (noteId: number) => {
        setNotes(notes.filter(n => n.id !== noteId));
    };

    const handleArchiveNote = (noteId: number) => {
        setNotes(notes.map(n => n.id === noteId ? { ...n, status: 'archived' } : n));
    };

  return (
    <div className="p-0">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-headline">{subjectTitle}</h1>
            <Button variant="glow" onClick={handleCreate}><Plus className="mr-2"/> Add Note</Button>
        </div>

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
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
            />
        )}

      </AnimatePresence>
    </div>
  );
}
