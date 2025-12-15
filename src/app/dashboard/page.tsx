'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pin, PinOff, LayoutGrid } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { StickyNote, StickyNoteData, StickyNoteColor } from '@/components/sticky-note';

const initialNotes: StickyNoteData[] = [
  { id: '1', content: 'Remember to check the new handwriting models in the Generate tab!', position: { x: 50, y: 50 }, size: { width: 200, height: 150 }, color: 'yellow' },
  { id: '2', content: 'Formula: E=mc^2', position: { x: 300, y: 100 }, size: { width: 200, height: 150 }, color: 'pink' },
];

const noteColors: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green'];
function getNextColor(currentIndex: number): StickyNoteColor {
    return noteColors[currentIndex % noteColors.length];
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [showNotes, setShowNotes] = useState(true);

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
      content: 'New sticky note...',
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      size: { width: 200, height: 150 },
      color: getNextColor(notes.length),
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
  };

  const updateNote = (id: string, newContent: string) => {
    setNotes(prevNotes =>
      prevNotes.map(note => (note.id === id ? { ...note, content: newContent } : note))
    );
  };
  
  const updateNotePosition = (id: string, newPosition: { x: number; y: number }) => {
    setNotes(prevNotes =>
      prevNotes.map(note => (note.id === id ? { ...note, position: newPosition } : note))
    );
  };


  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };
  
  const formatNotes = () => {
    const newNotes = notes.map((note, index) => {
      const x = 50 + (index % 5) * 30; // Cascade horizontally
      const y = 120 + index * 40; // Cascade vertically
      return { ...note, position: { x, y } };
    });
    setNotes(newNotes);
  };


  return (
    <div className="w-full h-full relative">
        <Card className="glass-pane absolute top-0 left-0 z-10">
            <CardHeader className="p-4 flex-row items-center justify-between">
                <CardTitle className="font-headline">Sticky Notes</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={formatNotes}>
                        <LayoutGrid />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setShowNotes(!showNotes)}>
                        {showNotes ? <PinOff /> : <Pin />}
                    </Button>
                    <Button variant="glow" size="icon" onClick={addNote}>
                        <Plus />
                    </Button>
                </div>
            </CardHeader>
        </Card>

        <AnimatePresence>
            {showNotes && notes.map(note => (
                 <StickyNote 
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onPositionChange={updateNotePosition}
                 />
            ))}
        </AnimatePresence>
    </div>
  );
}
