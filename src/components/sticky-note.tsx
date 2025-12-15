
'use client';

import React, { useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X, GripVertical } from 'lucide-react';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: StickyNoteColor;
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
  const dragControls = useDragControls();


  const handleBlur = () => {
    setIsEditing(false);
    onUpdate(note.id, content);
  };
  
  const handleDragEnd = (event: any, info: any) => {
    onPositionChange(note.id, { x: info.point.x, y: info.point.y });
  };
  
  const startDrag = (event: React.PointerEvent) => {
    dragControls.start(event, { snapToCursor: false });
  }

  const noteColorClasses = {
      yellow: 'bg-yellow-200 border-yellow-300 text-yellow-800',
      pink: 'bg-pink-200 border-pink-300 text-pink-800',
      blue: 'bg-blue-200 border-blue-300 text-blue-800',
      green: 'bg-green-200 border-green-300 text-green-800',
  }

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      dragConstraints={{ top: 0, left: 0, right: window.innerWidth - note.size.width, bottom: window.innerHeight - note.size.height }}
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
      <Card className={cn(
        "w-full h-full p-2 flex flex-col rounded-lg border shadow-lg",
        noteColorClasses[note.color]
      )}>
        <div className="flex items-center justify-between pb-1">
           <div onPointerDown={startDrag} className="cursor-grab p-1 -ml-1 flex-1">
             <GripVertical className="h-4 w-4 text-black/40" />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-black/50 hover:bg-black/10 hover:text-black/80" onClick={() => onDelete(note.id)}>
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
              className="w-full h-full resize-none border-none focus-visible:ring-0 bg-transparent text-sm placeholder:text-inherit/70"
            />
          ) : (
            <div className="p-2 text-sm whitespace-pre-wrap w-full h-full">
              {content}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
