'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams, notFound } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useStorage,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WithId } from '@/firebase/firestore/use-collection';
import { useDebouncedCallback } from 'use-debounce';
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, GripVertical, Loader, X, AlertTriangle, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteEditor } from '@/components/note-editor';
import { DocumentPreviewer } from '@/components/document-previewer';
import { LoadingAnimation } from '@/components/loading-animation';
import { useToast } from '@/hooks/use-toast';


const ItemTypes = {
  BLOCK: 'block',
};

type NoteBlock = {
  id: string;
  type: 'text' | 'document' | 'pdf';
  content: any;
  order: number;
};

type Note = WithId<{
  title: string;
  blocks: NoteBlock[];
}>;

interface BlockProps {
    block: NoteBlock;
    index: number;
    moveBlock: (dragIndex: number, hoverIndex: number) => void;
    updateBlockContent: (id: string, newContent: any) => void;
    removeBlock: (id: string) => void;
}

const Block = ({ block, index, moveBlock, updateBlockContent, removeBlock }: BlockProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.BLOCK,
    hover(item: { index: number }, monitor: DropTargetMonitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      moveBlock(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.BLOCK,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  drag(drop(ref));
  
  const debouncedUpdate = useDebouncedCallback(updateBlockContent, 500);

  return (
    <div
      ref={preview}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="relative transition-opacity"
    >
      <div ref={ref} className="p-4 my-2 rounded-lg glass-pane border border-transparent hover:border-accent/50 transition-all group">
        <button ref={drag} className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 cursor-grab p-2 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 focus:outline-none">
          <GripVertical />
        </button>
        <Button
            variant="destructive" size="icon"
            onClick={() => removeBlock(block.id)}
            className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all z-10">
            <X className="h-4 w-4" />
        </Button>

        {block.type === 'text' && (
            <NoteEditor
                value={block.content}
                onChange={(newContent) => debouncedUpdate(block.id, newContent)}
            />
        )}
        {(block.type === 'document' || block.type === 'pdf') && (
            <DocumentPreviewer
                fileName={block.content.fileName}
                fileType={block.content.fileType}
                fileURL={block.content.fileURL}
            />
        )}
      </div>
    </div>
  );
};


export default function NoteEditPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const noteId = params.noteId as string;
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const noteDocRef = useMemoFirebase(
    () => (user && subjectId && noteId ? doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId) : null),
    [firestore, user, subjectId, noteId]
  );
  
  const { data: note, isLoading, error } = useDoc<Note>(noteDocRef);

  const [title, setTitle] = useState(note?.title || '');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBlocks(note.blocks.sort((a,b) => a.order - b.order));
    }
  }, [note]);

  const handleSave = () => {
    if (!noteDocRef) return;
    const blocksWithOrder = blocks.map((block, index) => ({ ...block, order: index }));
    updateDocumentNonBlocking(noteDocRef, {
      title: title,
      blocks: blocksWithOrder,
      lastEdited: serverTimestamp(),
    });
    toast({ title: "Note Saved!", description: "Your changes have been saved." });
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const updateBlockContent = (id: string, newContent: any) => {
    setBlocks(currentBlocks =>
      currentBlocks.map(b => (b.id === id ? { ...b, content: newContent } : b))
    );
  };
  
  const addFileAsNewBlock = async (file: File) => {
      if (!user || !noteId) return;
      setIsUploading(true);

      const newBlockId = uuidv4();
      const fileType = file.type;
      const filePath = `users/${user.uid}/notes/${noteId}/${newBlockId}-${file.name}`;
      const fileStorageRef = storageRef(storage, filePath);

      try {
          await uploadBytes(fileStorageRef, file);
          const fileURL = await getDownloadURL(fileStorageRef);
          
          let blockType: 'text' | 'document' | 'pdf' = 'document';
          if(fileType.startsWith('image/')) blockType = 'text';
          if(fileType === 'application/pdf') blockType = 'pdf';

          const fileContent = {
              fileURL,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
          };
          
          let newBlock: NoteBlock;

          if (blockType === 'text') { // Image
               newBlock = {
                  id: newBlockId,
                  type: 'text',
                  content: { type: 'doc', content: [{ type: 'image', attrs: { src: fileURL }}, {type: 'paragraph'}]},
                  order: blocks.length,
              };
          } else { // Document or PDF
               newBlock = {
                  id: newBlockId,
                  type: blockType,
                  content: fileContent,
                  order: blocks.length,
              };
          }
           setBlocks(prev => [...prev, newBlock]);

      } catch (err) {
          console.error("File upload failed", err);
          toast({ variant: 'destructive', title: "Upload Failed", description: "Could not upload your file."});
      } finally {
          setIsUploading(false);
      }
  };
  
  const addTextBlock = () => {
      const newBlock: NoteBlock = {
          id: uuidv4(),
          type: 'text',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
          order: blocks.length,
      };
      setBlocks(currentBlocks => [...currentBlocks, newBlock]);
  };
  
  const removeBlock = (id: string) => {
    setBlocks(currentBlocks => currentBlocks.filter(b => b.id !== id));
  };
  
  const moveBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    setBlocks((prevBlocks) => {
      const newBlocks = [...prevBlocks];
      const [draggedBlock] = newBlocks.splice(dragIndex, 1);
      newBlocks.splice(hoverIndex, 0, draggedBlock);
      return newBlocks;
    });
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
        addFileAsNewBlock(file);
        if(fileInputRef.current) fileInputRef.current.value = '';
     }
  };


  if (isLoading || !noteId) {
    return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
  }
  
  if (error) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-destructive">
            <AlertTriangle className="h-12 w-12" />
            <h2 className="mt-4 text-2xl font-bold">Error Loading Note</h2>
            <p>{error.message}</p>
        </div>
     );
  }

  if (!note) {
    notFound();
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {isUploading && <LoadingAnimation text="Uploading file..." />}
      <div>
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href={`/dashboard/notes/${subjectId}`}><ArrowLeft /></Link>
            </Button>
            <Input 
              value={title}
              onChange={handleTitleChange}
              className="text-2xl font-headline h-auto p-0 border-none focus-visible:ring-0 bg-transparent text-glow"
              placeholder="Untitled Note"
            />
          </div>
          <Button variant="glow" onClick={handleSave}><Save className="mr-2"/>Save Note</Button>
        </header>

        <div className="space-y-2">
            {blocks.map((block, i) => (
                <Block 
                    key={block.id} 
                    block={block} 
                    index={i} 
                    moveBlock={moveBlock}
                    updateBlockContent={updateBlockContent}
                    removeBlock={removeBlock}
                />
            ))}
        </div>
        
        <div className="mt-4 flex justify-center gap-4">
            <Button onClick={addTextBlock} variant="secondary">Add Text Block</Button>
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf,.doc,.docx,.ppt,.pptx,.txt" className="hidden" />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Add Document</Button>
        </div>

      </div>
    </DndProvider>
  );
}
