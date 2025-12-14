'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteEditor } from '@/components/note-editor';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DocumentPreviewer } from '@/components/document-previewer';

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


const BlockViewer = ({ block }: { block: NoteBlock }) => {
    if (block.type === 'text') {
        return <NoteEditor value={block.content} isEditable={false} />;
    }
    
    if (block.type === 'pdf' || block.type === 'document') {
        return (
            <div className="my-4 not-prose">
                <div className={`p-4 rounded-lg bg-card border-l-4 ${block.type === 'pdf' ? 'border-accent' : 'border-primary'} shadow-md`}>
                    <h3 className="text-sm font-semibold mb-2 text-foreground">{block.content.fileName}</h3>
                    <DocumentPreviewer 
                        fileURL={block.content.fileURL}
                        fileType={block.content.fileType}
                        fileName={block.content.fileName}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 my-2 rounded-lg bg-destructive/10 border border-destructive">
            <p className="text-destructive-foreground">Unknown block type: {block.type}</p>
        </div>
    );
}

export default function NoteViewPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const noteId = params.noteId as string;
  const { user } = useUser();
  const firestore = useFirestore();

  const noteDocRef = useMemoFirebase(
    () => (user && subjectId && noteId ? doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId) : null),
    [firestore, user, subjectId, noteId]
  );
  const { data: note, isLoading, error } = useDoc<Note>(noteDocRef);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                 <Skeleton className="h-10 w-24" />
                 <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
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
  
  const sortedBlocks = note.blocks.sort((a, b) => a.order - b.order);

  return (
     <DndProvider backend={HTML5Backend}>
        <div>
          <header className="flex items-center justify-between gap-4 mb-6">
            <Button asChild variant="outline" size="icon">
              <Link href={`/dashboard/notes/${subjectId}`}><ArrowLeft /></Link>
            </Button>
             <Button asChild variant="glow">
                <Link href={`/dashboard/notes/${subjectId}/${noteId}/edit`}><Edit className="mr-2" /> Edit</Link>
            </Button>
          </header>
          
          <h1 className="text-4xl font-headline text-glow mb-8">{note.title}</h1>
          
          <div className="space-y-2">
            {sortedBlocks.map((block) => (
              <BlockViewer key={block.id} block={block} />
            ))}
          </div>

        </div>
    </DndProvider>
  );
}
