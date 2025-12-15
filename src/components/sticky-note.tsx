
'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X } from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { useDebounce } from 'use-debounce';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  isNew?: boolean;
}

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (id: string, newTitle: string, newContent:string) => void;
  onDelete: (id: string) => void;
  onBlurNew: (id: string, title: string, content: string) => void;
}

export function StickyNote({ note, onUpdate, onDelete, onBlurNew }: StickyNoteProps) {
  const [title, setTitle] = React.useState(note.title);
  const [content, setContent] = React.useState(note.content);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const isNewRef = useRef(note.isNew);
  
  const [debouncedTitle] = useDebounce(title, 500);
  const [debouncedContent] = useDebounce(content, 500);
  
  useEffect(() => {
    isNewRef.current = note.isNew;
  }, [note.isNew]);

  React.useEffect(() => {
    // Only call update if it's not a new note that's just been added
    if (!isNewRef.current && (debouncedTitle !== note.title || debouncedContent !== note.content)) {
        onUpdate(note.id, debouncedTitle, debouncedContent);
    }
  }, [debouncedTitle, debouncedContent, note.id, note.title, note.content, onUpdate]);

  React.useEffect(() => {
      if (note.title !== title) setTitle(note.title);
      if (note.content !== content) setContent(note.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.title, note.content]);
  
  const noteColorClasses = {
      yellow: 'bg-yellow-300/80 border-yellow-400/80 text-neutral-900',
      pink: 'bg-pink-300/80 border-pink-400/80 text-neutral-900',
      blue: 'bg-blue-300/80 border-blue-400/80 text-neutral-900',
      green: 'bg-green-400/80 border-green-500/80 text-neutral-900',
  }

  // Adjust textarea height
  React.useEffect(() => {
    const textarea = cardRef.current?.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  const handleBlur = () => {
    if (isNewRef.current) {
      onBlurNew(note.id, title, content);
      if(title || content) {
          onUpdate(note.id, title, content);
          isNewRef.current = false;
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="break-inside-avoid"
      onBlur={handleBlur}
    >
      <Card ref={cardRef} className={cn(
        "p-4 flex flex-col rounded-lg border shadow-md w-full relative group",
        noteColorClasses[note.color]
      )}>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 text-black/30 hover:bg-black/10 hover:text-black/70 absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity" 
            onMouseDown={() => onDelete(note.id)} // use onMouseDown to prevent blur event from firing first
        >
            <X className="h-4 w-4" />
        </Button>
         <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-bold text-lg border-none bg-transparent focus-visible:ring-0 p-0 h-auto placeholder:text-inherit/70 mb-2"
            placeholder="Title"
            autoFocus={note.isNew}
        />
        
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={cn("w-full h-auto flex-grow resize-none border-none focus-visible:ring-0 bg-transparent text-sm placeholder:text-inherit/70 p-0 leading-relaxed", 
            // Check if content looks like code and apply code font
            /([<>/;{}()#]|\b(int|void|char|const|if|else|for|while)\b)/.test(content) ? 'font-code' : 'font-body'
          )}
          placeholder="Take a note..."
        />
      </Card>
    </motion.div>
  );
}
