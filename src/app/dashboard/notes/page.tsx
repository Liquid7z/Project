'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit, Plus, Save, X } from 'lucide-react';
import { NoteEditor } from '@/components/note-editor';

type Note = {
  id: number;
  title: string;
  content: string; // This would be structured content in a real app (e.g., JSON)
  lastEdited: string;
};

const mockNotesData: Note[] = [
  { 
    id: 1, 
    title: 'Quantum Mechanics Basics', 
    content: '<h1>Quantum Mechanics</h1><p>Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.</p><p>Key concepts include quantization of energy, wave-particle duality, and the uncertainty principle.</p>', 
    lastEdited: '2 hours ago' 
  },
  { 
    id: 2, 
    title: 'The Periodic Table', 
    content: '<h2>The Periodic Table of Elements</h2><p>The periodic table is a tabular arrangement of the chemical elements, ordered by their atomic number, electron configuration, and recurring chemical properties.</p>', 
    lastEdited: 'Yesterday' 
  },
  { 
    id: 3, 
    title: 'World War II Summary', 
    content: '<h3>A Brief Overview of World War II</h3><p>World War II was a global war that lasted from 1939 to 1945. It involved the vast majority of the world\'s countries—including all of the great powers—forming two opposing military alliances: the Allies and the Axis.</p>', 
    lastEdited: '3 days ago' 
  },
];


const NotePreviewCard = ({ note, onSelect }: { note: Note; onSelect: (note: Note) => void }) => {
  // A simple function to strip HTML for a plain text preview
  const getSnippet = (html: string) => {
    if (typeof window === 'undefined') return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.slice(0, 150) + '...' || '';
  };
  
  return (
    <motion.div
      layoutId={`note-card-${note.id}`}
      onClick={() => onSelect(note)}
      className="cursor-pointer"
      whileHover={{ scale: 1.02 }}
    >
      <Card className="group glass-pane transition-all hover:border-accent">
        <CardHeader>
          <CardTitle className="font-headline text-glow truncate">{note.title}</CardTitle>
        </CardHeader>
        <CardContent className="relative h-24">
            <div 
                className="text-sm text-muted-foreground overflow-hidden" 
                dangerouslySetInnerHTML={{ __html: note.content }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Edited {note.lastEdited}</p>
        </CardFooter>
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
    const [currentNote, setCurrentNote] = useState<Note>(
        note || { id: Date.now(), title: '', content: '', lastEdited: new Date().toISOString() }
    );

    const handleSave = () => {
        onSave({
            ...currentNote,
            lastEdited: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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


export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>(mockNotesData);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
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

  return (
    <div className="p-0">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-headline">Notes</h1>
            <Button variant="glow" onClick={handleCreate}><Plus className="mr-2"/> Add Note</Button>
        </div>

      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map(note => (
                <NotePreviewCard key={note.id} note={note} onSelect={handleSelectNote} />
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
