
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { StickyNote, StickyNoteData, StickyNoteColor } from '@/components/sticky-note';

const initialNotes: StickyNoteData[] = [
  { id: '1', title: 'To-do list', content: '1. Reply to emails\n2. Prepare presentation slides\n3. Market research', position: { x: 50, y: 50 }, size: { width: 200, height: 150 }, color: 'pink' },
  { id: '2', title: 'Shopping list', content: '1. Rice\n2. Pasta\n3. Cereal\n4. Yogurt', position: { x: 300, y: 100 }, size: { width: 200, height: 150 }, color: 'yellow' },
  { id: '3', title: 'Important', content: 'Summarize the key action items identified during the meeting.', position: { x: 550, y: 150 }, size: { width: 200, height: 150 }, color: 'green' },
  { id: '4', title: 'Product Meeting', content: '1. Review of Previous Action Items\n2. Product Development Update\n3. User Feedback', position: { x: 50, y: 250 }, size: { width: 200, height: 150 }, color: 'blue' },
];

const noteColors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];
function getNextColor(currentIndex: number): StickyNoteColor {
    return noteColors[currentIndex % noteColors.length];
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<StickyNoteData[]>([]);

  useEffect(() => {
    const savedNotes = localStorage.getItem('sticky-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      setNotes(initialNotes);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sticky-notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    const newNote: StickyNoteData = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: 'Start writing here...',
      position: { x: 0, y: 0 }, // Position is no longer used for layout
      size: { width: 250, height: 'auto' as any }, // Height will be automatic
      color: getNextColor(notes.length),
    };
    setNotes(prevNotes => [newNote, ...prevNotes]);
  };

  const updateNote = (id: string, newTitle: string, newContent: string) => {
    setNotes(prevNotes =>
      prevNotes.map(note => (note.id === id ? { ...note, title: newTitle, content: newContent } : note))
    );
  };
  
  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };
  
  return (
    <div className="relative w-full min-h-full">
      <div className="p-4 md:p-6">
        <div 
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4"
        >
          <AnimatePresence>
            {notes.map(note => (
                 <StickyNote 
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                 />
            ))}
          </AnimatePresence>
        </div>
      </div>

       <Button variant="glow" size="icon" onClick={addNote} className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg z-50">
          <Plus className="h-8 w-8" />
       </Button>
    </div>
  );
}
