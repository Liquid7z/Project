'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy, where, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { WithId } from '@/firebase/firestore/use-collection';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Book, FileText, Bot, Plus, Edit, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import DocumentBlock from '@/components/document-block';
import PdfBlock from '@/components/pdf-block';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DocumentPreviewer } from '@/components/document-previewer';
import { FileUploader } from '@/components/file-uploader';
import { v4 as uuidv4 } from 'uuid';
import { useStorage } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { NoteEditor } from '@/components/note-editor';

const ItemTypes = {
  BLOCK: 'block',
};

type Subject = WithId<{
  name: string;
}>;

type NoteBlock = {
  id: string;
  type: 'text' | 'document';
  content: any; // JSON for text, or file info for document
  order: number;
};

type Note = WithId<{
  title: string;
  blocks: NoteBlock[];
  lastEdited: any;
}>;

const Block = ({ block, moveBlock, index }: { block: NoteBlock, moveBlock: (dragIndex: number, hoverIndex: number) => void; index: number }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.BLOCK,
    hover(item: { index: number }) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) {
        return;
      }
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
    <div ref={preview} style={{ opacity: isDragging ? 0.5 : 1 }} className="relative">
      <div ref={ref} className="p-4 my-2 rounded-lg glass-pane border border-transparent hover:border-accent transition-all">
        <button ref={drag} className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab p-2 text-muted-foreground hover:text-foreground">
          <GripVertical />
        </button>
        {block.type === 'text' && <NoteEditor value={block.content} onChange={() => {}} />}
        {block.type === 'document' && (
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


const NotesSection = ({ subjectId }: { subjectId: string }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const notesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes'), orderBy('lastEdited', 'desc')) : null,
    [firestore, user, subjectId]
  );
  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const handleCreateNote = async () => {
    if (!user || !notesQuery) return;
    const notesCollection = collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes');
    const newNote = {
      title: 'Untitled Note',
      blocks: [{ id: uuidv4(), type: 'text', content: { type: 'doc', content: [{ type: 'paragraph' }] }, order: 0 }],
      lastEdited: serverTimestamp(),
      userId: user.uid,
      subjectId: subjectId,
    };
    const newDoc = await addDocumentNonBlocking(notesCollection, newNote);
    if(newDoc?.id) {
        setEditingNoteId(newDoc.id);
    }
  };
  
  if (editingNoteId) {
      // return <NoteEditor noteId={editingNoteId} subjectId={subjectId} onBack={() => setEditingNoteId(null)} />;
      // For now, let's just show a placeholder
      return <div>Editing note...</div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleCreateNote} variant="glow"><Plus className="mr-2" /> New Note</Button>
      </div>
       {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && notes?.map(note => (
        <Card key={note.id} className="mb-4 glass-pane hover:border-accent transition-colors">
            <CardHeader>
                <CardTitle>{note.title}</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Render a preview of the note content */}
                <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-3">
                   {note.blocks.find(b => b.type === 'text')?.content?.content[0]?.content?.[0]?.text || 'No content preview.'}
                </div>
            </CardContent>
        </Card>
      ))}
       {!isLoading && !notes?.length && (
         <div className="text-center py-12 text-muted-foreground">
             <Book className="mx-auto h-12 w-12"/>
             <p className="mt-4">No notes created yet.</p>
         </div>
       )}
    </div>
  );
};


export default function SubjectPage({ params: paramsPromise }: { params: Promise<{ subjectId: string }> }) {
  const params = use(paramsPromise);
  const { subjectId } = params;
  const { user } = useUser();
  const firestore = useFirestore();

  const subjectDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid, 'subjects', subjectId) : null),
    [firestore, user, subjectId]
  );
  const { data: subject, isLoading: isLoadingSubject } = useDoc<Subject>(subjectDocRef);

  if (isLoadingSubject) {
    return <Skeleton className="h-screen w-full" />;
  }

  return (
    <div>
      <header className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/notes"><ArrowLeft /></Link>
        </Button>
        <h1 className="text-3xl font-headline text-glow">{subject?.name || 'Subject'}</h1>
      </header>
      
      <Tabs defaultValue="notes">
        <TabsList className="grid w-full grid-cols-4 bg-card/60 p-1 h-auto">
          <TabsTrigger value="notes"><Book className="mr-2" />Notes</TabsTrigger>
          <TabsTrigger value="exam_questions"><FileText className="mr-2" />Exam Questions</TabsTrigger>
          <TabsTrigger value="syllabus"><Bot className="mr-2" />Syllabus</TabsTrigger>
          <TabsTrigger value="resources"><Plus className="mr-2" />Other Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" className="py-6">
           <NotesSection subjectId={subjectId} />
        </TabsContent>
        <TabsContent value="exam_questions" className="py-6">
            <Card className="glass-pane">
                <CardHeader><CardTitle>Exam Questions</CardTitle><CardDescription>Coming soon...</CardDescription></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="syllabus" className="py-6">
            <Card className="glass-pane">
                <CardHeader><CardTitle>Syllabus</CardTitle><CardDescription>Coming soon...</CardDescription></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="resources" className="py-6">
             <Card className="glass-pane">
                <CardHeader><CardTitle>Other Resources</CardTitle><CardDescription>Coming soon...</CardDescription></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
