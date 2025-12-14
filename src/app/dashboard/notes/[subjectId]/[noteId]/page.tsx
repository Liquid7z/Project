'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteEditor } from '@/components/note-editor';
import { DocumentPreviewer } from '@/components/document-previewer';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type NoteBlock = {
  id: string;
  type: 'text' | 'document' | 'pdf';
  content: any;
  order: number;
};

type Note = WithId<{
  title: string;
  blocks: NoteBlock[];
  subjectName?: string;
  subjectDescription?: string;
}>;


const BlockViewer = ({ block }: { block: NoteBlock }) => {
    if (block.type === 'text') {
        return <NoteEditor value={block.content} isEditable={false} />;
    }
    
    if (block.type === 'pdf' || block.type === 'document') {
        return (
            <div className="my-4 not-prose p-4 rounded-lg bg-card border">
                <DocumentPreviewer 
                    fileURL={block.content.fileURL}
                    fileType={block.content.fileType}
                    fileName={block.content.fileName}
                />
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
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const noteDocRef = useMemoFirebase(
    () => (user && subjectId && noteId ? doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId) : null),
    [firestore, user, subjectId, noteId]
  );
  const { data: note, isLoading: isLoadingNote, error } = useDoc<Note>(noteDocRef);

  const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');

  if (isUserLoading || isLoadingNote) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                 <Skeleton className="h-10 w-24" />
                 <Skeleton className="h-10 w-24" />
            </div>
             <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
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
    <div className="max-w-4xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-6 sticky top-16 bg-background/80 backdrop-blur-md py-4 z-20">
        <Button asChild variant="outline" size="icon">
          <Link href={`/dashboard/notes/${subjectId}`}><ArrowLeft /></Link>
        </Button>
         <Button asChild variant="glow">
            <Link href={`/dashboard/notes/${subjectId}/${noteId}/edit`}><Edit className="mr-2" /> Edit Note</Link>
        </Button>
      </header>

      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
        {heroImage && <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          quality={100}
          className="object-cover"
          data-ai-hint={heroImage.imageHint}
          priority
        />}
      </div>
      
      <div className="glass-pane p-6 rounded-lg mb-4">
        <h1 className="text-3xl font-headline text-glow">{note.subjectName || note.title}</h1>
        {note.subjectDescription && <p className="text-muted-foreground">{note.subjectDescription}</p>}
      </div>
      
      <div className="glass-pane p-6 rounded-lg">
          <div className="pt-4">
            {sortedBlocks.map((block) => (
              <BlockViewer key={block.id} block={block} />
            ))}
            {sortedBlocks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>This note is empty.</p>
                    <p className="text-sm">Click "Edit Note" to add content.</p>
                </div>
            )}
          </div>
      </div>

    </div>
  );
}
