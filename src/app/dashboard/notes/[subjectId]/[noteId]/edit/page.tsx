'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, notFound, useParams } from 'next/navigation';
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
import { ArrowLeft, GripVertical, Loader, X, AlertTriangle } from 'lucide-react';
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
    updateBlock: (id: string, newContent: any) => void;
    removeBlock: (id: string) => void;
    addFile: (file: File) => void;
}

const Block = ({ block, index, moveBlock, updateBlock, removeBlock, addFile }: BlockProps) => {
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

  return (
    <div
      ref={preview}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="relative transition-opacity"
    >
      <div ref={ref} className="p-4 my-2 rounded-lg glass-pane border border-transparent hover:border-accent/50 transition-all group">
        <button ref={drag} className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 cursor-grab p-2 text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100">
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
                onChange={(newContent) => updateBlock(block.id, newContent)}
                onAddFile={addFile}
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
  const [blocks, setBlocks] = useState<NoteBlock[]>(note?.blocks || []);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBlocks(note.blocks.sort((a,b) => a.order - b.order));
    }
  }, [note]);


  const debouncedSave = useDebouncedCallback(
    (newTitle: string, newBlocks: NoteBlock[]) => {
      if (!noteDocRef) return;
      const blocksWithOrder = newBlocks.map((block, index) => ({ ...block, order: index }));
      updateDocumentNonBlocking(noteDocRef, {
        title: newTitle,
        blocks: blocksWithOrder,
        lastEdited: serverTimestamp(),
      });
       toast({ title: "Note Saved!", description: "Your changes have been saved." });
    },
    1000
  );

  useEffect(() => {
    if(!isLoading && note && (title !== note.title || JSON.stringify(blocks) !== JSON.stringify(note.blocks.sort((a,b) => a.order - b.order)))) {
      debouncedSave(title, blocks);
    }
  }, [title, blocks, debouncedSave, isLoading, note]);
  

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const updateBlock = (id: string, newContent: any) => {
    setBlocks(currentBlocks =>
      currentBlocks.map(b => (b.id === id ? { ...b, content: newContent } : b))
    );
  };
  
  const addFile = async (file: File) => {
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
          
          if(blockType === 'text') {
              // find last text block and add image to it.
              const lastTextBlockIndex = blocks.findLastIndex(b => b.type === 'text');
              if (lastTextBlockIndex !== -1) {
                  const lastTextBlock = blocks[lastTextBlockIndex];
                  const newEditorContent = {
                      ...lastTextBlock.content,
                      content: [
                          ...lastTextBlock.content.content,
                          { type: 'image', attrs: { src: fileURL } },
                          { type: 'paragraph' } // Add a new paragraph after image
                      ]
                  };
                  updateBlock(lastTextBlock.id, newEditorContent);
              } else {
                  // if no text block, create a new one with the image
                  const newBlock: NoteBlock = {
                      id: uuidv4(),
                      type: 'text',
                      content: { type: 'doc', content: [{ type: 'image', attrs: { src: fileURL }}, {type: 'paragraph'}]},
                      order: blocks.length,
                  };
                  setBlocks(prev => [...prev, newBlock]);
              }
          } else {
               const newBlock: NoteBlock = {
                  id: newBlockId,
                  type: blockType,
                  content: fileContent,
                  order: blocks.length,
              };
              setBlocks(prev => [...prev, newBlock]);
          }

      } catch (err) {
          console.error("File upload failed", err);
          toast({ variant: 'destructive', title: "Upload Failed", description: "Could not upload your file."});
      } finally {
          setIsUploading(false);
      }
  };
  
  const addBlock = (type: 'text' = 'text') => {
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
        <header className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="icon">
            <Link href={`/dashboard/notes/${subjectId}`}><ArrowLeft /></Link>
          </Button>
          <Input 
            value={title}
            onChange={handleTitleChange}
            className="text-2xl font-headline h-auto p-0 border-none focus-visible:ring-0 bg-transparent text-glow"
            placeholder="Untitled Note"
          />
        </header>

        <div className="space-y-2">
            {blocks.map((block, i) => (
                <Block 
                    key={block.id} 
                    block={block} 
                    index={i} 
                    moveBlock={moveBlock}
                    updateBlock={updateBlock}
                    removeBlock={removeBlock}
                    addFile={addFile}
                />
            ))}
        </div>
        
        <div className="mt-4 flex justify-center">
            <Button onClick={() => addBlock('text')} variant="secondary">Add Text Block</Button>
        </div>

      </div>
    </DndProvider>
  );
}
