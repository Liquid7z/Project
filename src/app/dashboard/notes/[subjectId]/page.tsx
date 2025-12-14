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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Book, FileText, Bot, Plus, Edit, Trash2, GripVertical, Image as ImageIcon, Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/file-uploader';
import { extractTextAction } from '@/actions/generation';
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


const NewNoteDialog = ({ subjectId, onNoteCreated }: { subjectId: string; onNoteCreated: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [textContent, setTextContent] = useState('');
    const [activeTab, setActiveTab] = useState('text');
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const notesCollectionRef = useMemoFirebase(() => 
        user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null
    , [user, firestore, subjectId]);
    
    const resetState = () => {
        setTitle('');
        setTextContent('');
        setActiveTab('text');
        setIsLoading(false);
    };

    const handleFileUploader = async (file: File) => {
        setIsLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const documentDataUri = reader.result as string;
                const { extractedText } = await extractTextAction({ documentDataUri });
                setTextContent(extractedText);
                setTitle(file.name.split('.').slice(0, -1).join('.') || 'Untitled Note');
                setActiveTab('text'); // Switch to text tab to show extracted content
            } catch (error) {
                console.error("Failed to extract text:", error);
                toast({ variant: 'destructive', title: 'Extraction Failed', description: 'Could not extract text from document.' });
            } finally {
                setIsLoading(false);
            }
        };
    };

    const handleCreateNote = async () => {
        if (!user || !notesCollectionRef || !title) {
            toast({ variant: 'destructive', title: 'Error', description: 'Title is required to create a note.'});
            return;
        }

        setIsLoading(true);
        const newNoteData = {
            title: title,
            blocks: [{ id: uuidv4(), type: 'text', content: { type: 'doc', content: [{ type: 'paragraph', content: textContent ? [{ type: 'text', text: textContent }] : [] }] }, order: 0 }],
            lastEdited: serverTimestamp(),
            userId: user.uid,
            subjectId: subjectId,
        };

        try {
            await addDocumentNonBlocking(notesCollectionRef, newNoteData);
            toast({ title: 'Note Created!', description: `"${title}" has been added to this subject.` });
            onNoteCreated(); // This could trigger a refresh on the parent component
            setIsOpen(false);
            resetState();
        } catch (error) {
            console.error("Error creating new note: ", error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'There was an error creating your note.' });
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="glow"><Plus className="mr-2" /> New Note</Button>
            </DialogTrigger>
            <DialogContent className="glass-pane sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Create a New Note</DialogTitle>
                    <DialogDescription>Add content by typing, pasting, or uploading a document.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input 
                        placeholder="Note Title" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="font-headline text-lg"
                    />
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="text">Type/Paste</TabsTrigger>
                            <TabsTrigger value="upload">Upload Document</TabsTrigger>
                        </TabsList>
                        <TabsContent value="text" className="mt-4">
                            <Textarea 
                                placeholder="Start writing your note content here..."
                                className="min-h-[200px]"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                        </TabsContent>
                         <TabsContent value="upload" className="mt-4">
                            <FileUploader 
                                onFileUpload={handleFileUploader}
                                acceptedFiles={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateNote} disabled={isLoading || !title}>
                        {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        Create Note
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const NotesSection = ({ subjectId }: { subjectId: string }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const notesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes'), orderBy('lastEdited', 'desc')) : null,
    [firestore, user, subjectId]
  );
  const { data: notes, isLoading, forceRefresh } = useCollection<Note>(notesQuery);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <NewNoteDialog subjectId={subjectId} onNoteCreated={forceRefresh} />
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
