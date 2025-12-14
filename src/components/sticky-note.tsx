'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X, GripVertical } from 'lucide-react';
import { Card } from './ui/card';

export interface StickyNoteData {
  id: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
  onPositionChange: (id: string, newPosition: { x: number, y: number }) => void;
}

export function StickyNote({ note, onUpdate, onDelete, onPositionChange }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(note.id, content);
  };
  
  const handleDragEnd = (event: any, info: any) => {
    onPositionChange(note.id, { x: info.point.x, y: info.point.y });
  };


  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{ top: 0, left: 0, right: window.innerWidth - 250, bottom: window.innerHeight - 250 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.8, x: note.position.x, y: note.position.y }}
      animate={{ opacity: 1, scale: 1, x: note.position.x, y: note.position.y }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute z-20"
      style={{
        width: `${note.size.width}px`,
        height: `${note.size.height}px`,
      }}
    >
      <Card className="w-full h-full p-2 flex flex-col glass-pane border-accent/50 shadow-lg shadow-accent/10">
        <div className="flex items-center justify-between pb-1">
          <motion.div dragMomentum={false} dragControls={{start: () => {}}} className="cursor-grab p-1 -ml-1">
             <GripVertical className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(note.id)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-grow h-full" onDoubleClick={() => setIsEditing(true)}>
          {isEditing ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleBlur}
              autoFocus
              className="w-full h-full resize-none border-none focus-visible:ring-0 bg-transparent text-sm"
            />
          ) : (
            <div className="p-2 text-sm text-foreground whitespace-pre-wrap w-full h-full">
              {content}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
