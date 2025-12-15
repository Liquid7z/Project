
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X } from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id: string;
  title: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: StickyNoteColor;
}

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (id: string, newTitle: string, newContent: string) => void;
  onDelete: (id: string) => void;
}

export function StickyNote({ note, onUpdate, onDelete }: StickyNoteProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const handleBlur = () => {
    if (note.title !== title || note.content !== content) {
        onUpdate(note.id, title, content);
    }
  };
  
  const noteColorClasses = {
      yellow: 'bg-yellow-200/80 border-yellow-300/80 text-yellow-900',
      pink: 'bg-pink-200/80 border-pink-300/80 text-pink-900',
      blue: 'bg-blue-200/80 border-blue-300/80 text-blue-900',
      green: 'bg-green-200/80 border-green-300/80 text-green-900',
  }

  // Adjust textarea height
  useEffect(() => {
    const textarea = cardRef.current?.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="break-inside-avoid"
    >
      <Card ref={cardRef} className={cn(
        "p-4 flex flex-col rounded-lg border shadow-md w-full relative group",
        noteColorClasses[note.color]
      )}>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 text-black/30 hover:bg-black/10 hover:text-black/70 absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={() => onDelete(note.id)}
        >
            <X className="h-4 w-4" />
        </Button>
         <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            className="font-bold text-lg border-none bg-transparent focus-visible:ring-0 p-0 h-auto placeholder:text-inherit/70 mb-2"
            placeholder="Title"
        />
        
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          className="w-full h-auto flex-grow resize-none border-none focus-visible:ring-0 bg-transparent text-sm placeholder:text-inherit/70 p-0 leading-relaxed"
          placeholder="Take a note..."
        />
      </Card>
    </motion.div>
  );
}
