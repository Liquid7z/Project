
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { StickyNote } from '@/components/sticky-note';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { WithId } from '@/firebase';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id?: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  createdAt?: any;
  updatedAt?: any;
}


const noteColors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];
function getNextColor(currentIndex: number): StickyNoteColor {
    return noteColors[currentIndex % noteColors.length];
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const notesCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'stickyNotes');
  }, [user, firestore]);
  
  const notesQuery = useMemoFirebase(() => {
    if (!notesCollectionRef) return null;
    return query(notesCollectionRef, orderBy('createdAt', 'desc'));
  }, [notesCollectionRef]);

  const { data: notes, isLoading: areNotesLoading, error } = useCollection<StickyNoteData>(notesQuery);

  const addNote = async () => {
    if (!notesCollectionRef) return;
    const newNote: StickyNoteData = {
      title: 'New Note',
      content: 'Start writing here...',
      color: getNextColor(notes?.length || 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await addDoc(notesCollectionRef, newNote);
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const updateNote = async (id: string, newTitle: string, newContent: string) => {
    if (!user) return;
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
  };
  
  const deleteNote = async (id: string) => {
     if (!user) return;
    const noteRef = doc(firestore, 'users', user.uid, 'stickyNotes', id);
    try {
      await deleteDoc(noteRef);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };
  
  const isLoading = isUserLoading || areNotesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-full">
      <div className="p-4 md:p-6">
        <div 
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4"
        >
          <AnimatePresence>
            {notes && notes.map(note => (
                 <StickyNote 
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                 />
            ))}
          </AnimatePresence>
        </div>
         {notes && notes.length === 0 && !isLoading && (
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
