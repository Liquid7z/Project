
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { StickyNote } from '@/components/sticky-note';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import type { WithId } from '@/firebase';
import { v4 as uuidv4 } from 'uuid';
import { WipPage } from '@/components/wip-page';
import { useToast } from '@/hooks/use-toast';


export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id: string; // Now always present, client-generated for temp notes
  title: string;
  content: string;
  color: StickyNoteColor;
  createdAt?: any;
  updatedAt?: any;
  isNew?: boolean; // Flag for temporary notes
}


const noteColors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];
function getNextColor(currentIndex: number): StickyNoteColor {
    return noteColors[currentIndex % noteColors.length];
}

export default function StickyNotesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);
  const isAdmin = userProfile?.isAdmin === true;

  const notesCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'stickyNotes');
  }, [user, firestore]);
  
  const notesQuery = useMemoFirebase(() => {
    if (!notesCollectionRef) return null;
    return query(notesCollectionRef, orderBy('createdAt', 'desc'));
  }, [notesCollectionRef]);

  const { data: serverNotes, isLoading: areNotesLoading, error } = useCollection<Omit<StickyNoteData, 'id'>>(notesQuery);

  const [localNotes, setLocalNotes] = useState<StickyNoteData[]>([]);

  const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
  const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

  React.useEffect(() => {
    if (serverNotes) {
      // Merge server notes with any local-only new notes
      setLocalNotes(prevLocalNotes => {
        const newNotes = prevLocalNotes.filter(n => n.isNew);
        const serverNotesWithId = serverNotes.map(n => ({...n, id: n.id}));
        const existingIds = new Set(serverNotesWithId.map(n => n.id));
        const filteredNewNotes = newNotes.filter(n => !existingIds.has(n.id));
        return [...filteredNewNotes, ...serverNotesWithId];
      });
    }
  }, [serverNotes]);


  const addNote = () => {
    if (!isAdmin && siteConfig?.stickyNotesWip === false) {
        toast({
            title: "Feature Under Maintenance",
            description: "Adding new sticky notes is temporarily disabled. Please check back later.",
        });
        return;
    }
      
    const tempId = uuidv4();
    const newNote: StickyNoteData = {
      id: tempId,
      title: '',
      content: '',
      color: getNextColor(localNotes.length || 0),
      isNew: true,
    };
    setLocalNotes(prev => [newNote, ...prev]);
  };

  const updateNote = async (id: string, newTitle: string, newContent: string) => {
    const note = localNotes.find(n => n.id === id);
    if (!note || !user) return;

    // If it's a new note, we create it in Firestore
    if (note.isNew) {
      // Don't save if it's empty
      if (!newTitle && !newContent) {
        // It might be removed by the blur handler, but as a fallback:
        setLocalNotes(prev => prev.filter(n => n.id !== id));
        return;
      }
      
      if (!notesCollectionRef) return;
      const { isNew, ...noteToSave } = note;
      const finalNote = {
        ...noteToSave,
        title: newTitle,
        content: newContent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      try {
        // Use the client-generated ID to create the document
        const noteRef = doc(firestore, 'users', user.uid, 'stickyNotes', id);
        await setDoc(noteRef, finalNote);
      } catch (error) {
         console.error("Error adding note:", error);
      }

    } else { // It's an existing note, so update it
      const noteRef = doc(firestore, 'users', user.uid, 'stickyNotes', id);
      try {
        await updateDoc(noteRef, {
          title: newTitle,
          content: newContent,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error updating note:", error);
      }
    }
  };
  
  const deleteNote = async (id: string) => {
     if (!user) return;
    const note = localNotes.find(n => n.id === id);
    
    // If it's a new, unsaved note, just remove it from local state
    if (note && note.isNew) {
        setLocalNotes(prev => prev.filter(n => n.id !== id));
        return;
    }

    // Otherwise, delete from Firestore
    const noteRef = doc(firestore, 'users', user.uid, 'stickyNotes', id);
    try {
      await deleteDoc(noteRef);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleBlurNewNote = (id: string, title: string, content: string) => {
    if (!title && !content) {
      setLocalNotes(prev => prev.filter(n => n.id !== id));
    }
  };
  
  const isLoading = isUserLoading || areNotesLoading || isConfigLoading;
  
  if (siteConfig?.stickyNotesWip === false && !isAdmin) {
    return <WipPage />;
  }

  if (isLoading && localNotes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full">
      <div className="p-0 md:p-0">
        <div 
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4"
        >
          <AnimatePresence>
            {localNotes && localNotes.map(note => (
                 <StickyNote 
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onBlurNew={handleBlurNewNote}
                 />
            ))}
          </AnimatePresence>
        </div>
         {localNotes && localNotes.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold">No sticky notes yet.</h2>
                    <p className="text-muted-foreground mt-2">Click the '+' button to add your first one!</p>
                </div>
            </div>
        )}
      </div>

       <Button variant="glow" size="icon" onClick={addNote} className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg z-50">
          <Plus className="h-8 w-8" />
       </Button>
    </div>
  );
}
