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
} from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { WithId } from '@/firebase/firestore/use-collection';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Book, FileText, Bot, Plus, Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


type Subject = WithId<{
  name: string;
}>;

type NoteBlock = {
  id: string;
  type: 'text' | 'document' | 'pdf';
  content: any; // JSON for text, or file info for document
  order: number;
};

type Note = WithId<{
  title: string;
  blocks: NoteBlock[];
  lastEdited: any;
}>;


const NotesSection = ({ subjectId }: { subjectId: string }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const notesCollectionRef = useMemoFirebase(() =>
      user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null
  , [user, firestore, subjectId]);
  
  const notesQuery = useMemoFirebase(() =>
    notesCollectionRef ? query(notesCollectionRef, orderBy('lastEdited', 'desc')) : null,
    [notesCollectionRef]
  );
  
  const { data: notes, isLoading, forceRefresh } = useCollection<Note>(notesQuery);

  const handleCreateNote = async () => {
    if (!user || !notesCollectionRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a note.'});
        return;
    }
    
    setIsCreating(true);

    const newNoteData = {
        title: 'Untitled Note',
        blocks: [{ id: uuidv4(), type: 'text', content: { type: 'doc', content: [{ type: 'paragraph' }] }, order: 0 }],
        lastEdited: serverTimestamp(),
        userId: user.uid,
        subjectId: subjectId,
    };

    try {
        const docRef = await addDocumentNonBlocking(notesCollectionRef, newNoteData);
        toast({ title: 'Note Created!', description: 'Redirecting to your new note...' });
        router.push(`/dashboard/notes/${subjectId}/${docRef.id}/edit`);
    } catch (error) {
        console.error("Error creating new note: ", error);
        toast({ variant: 'destructive', title: 'Creation Failed', description: 'There was an error creating your note.' });
        setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="glow" onClick={handleCreateNote} disabled={isCreating}>
            {isCreating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2" />}
            New Note
        </Button>
      </div>
       {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && notes?.map(note => (
        <Link key={note.id} href={`/dashboard/notes/${subjectId}/${note.id}`}>
            <Card className="mb-4 glass-pane hover:border-accent transition-colors cursor-pointer">
                <CardHeader>
                    <CardTitle>{note.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-3">
                       {note.blocks.find(b => b.type === 'text')?.content?.content?.[0]?.content?.[0]?.text || 'No content preview.'}
                    </div>
                </CardContent>
            </Card>
        </Link>
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


export default function SubjectPage({ params }: { params: { subjectId: string } }) {
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
