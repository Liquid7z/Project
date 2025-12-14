

'use client';

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileUploader } from '@/components/file-uploader';
import { extractTextAction } from '@/actions/generation';


type Subject = WithId<{
  name: string;
}>;

type NoteBlock = {
  id: string;
  type: 'text' | 'document' | 'pdf';
  content: any;
  order: number;
};

type Note = WithId<{
  title: string;
  blocks: NoteBlock[];
  lastEdited: any;
}>;

const noteFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  content: z.string().optional(),
});


const NewNoteDialog = ({ subjectId }: { subjectId: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof noteFormSchema>>({
        resolver: zodResolver(noteFormSchema),
        defaultValues: { title: "", content: "" },
    });
    
    const notesCollectionRef = useMemoFirebase(() =>
        user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null
    , [user, firestore, subjectId]);


    const handleFileUpload = async (file: File) => {
        setIsLoading(true);
        form.setValue('content', 'Extracting text...');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const documentDataUri = reader.result as string;
                const result = await extractTextAction({ documentDataUri });
                form.setValue('content', result.extractedText);
                if(!form.getValues('title')){
                    // set title based on file name without extension
                    form.setValue('title', file.name.split('.').slice(0, -1).join('.'));
                }
            } catch (error) {
                console.error("Failed to extract text:", error);
                toast({
                    variant: "destructive",
                    title: "Text Extraction Failed",
                    description: "Could not extract text from the uploaded document."
                })
                form.setValue('content', '');
            } finally {
                setIsLoading(false);
            }
        };
    };

    const onSubmit = async (values: z.infer<typeof noteFormSchema>) => {
        if (!user || !notesCollectionRef) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a note.'});
            return;
        }

        setIsLoading(true);

        const newNoteData = {
            title: values.title,
            blocks: [{ id: uuidv4(), type: 'text', content: { type: 'doc', content: [{ type: 'paragraph', content: values.content ? [{type: 'text', text: values.content }] : undefined }] }, order: 0 }],
            lastEdited: serverTimestamp(),
            userId: user.uid,
            subjectId: subjectId,
        };

        try {
            await addDocumentNonBlocking(notesCollectionRef, newNoteData);
            toast({ title: 'Note Created!', description: `${values.title} has been added.` });
            setIsOpen(false);
            form.reset();
        } catch (error) {
            console.error("Error creating new note: ", error);
            toast({ variant: 'destructive', title: 'Creation Failed', description: 'There was an error creating your note.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="glow">
                    <Plus className="mr-2" /> New Note
                </Button>
            </DialogTrigger>
            <DialogContent className="glass-pane sm:max-w-[625px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle className="font-headline">Create a New Note</DialogTitle>
                            <DialogDescription>Add a title and content to start your new note.</DialogDescription>
                        </DialogHeader>
                        
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Chapter 1 Summary" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Tabs defaultValue="text">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="text">Type/Paste</TabsTrigger>
                                <TabsTrigger value="upload">Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="text" className="mt-4">
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Start writing your note here..."
                                                    className="min-h-[200px] bg-background/50"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                            <TabsContent value="upload" className="mt-4">
                                <FileUploader
                                    onFileUpload={handleFileUpload}
                                    acceptedFiles={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']}
                                />
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Note
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


const NotesSection = ({ subjectId }: { subjectId: string }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const notesCollectionRef = useMemoFirebase(() =>
      user ? collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes') : null
  , [user, firestore, subjectId]);
  
  const notesQuery = useMemoFirebase(() =>
    notesCollectionRef ? query(notesCollectionRef, orderBy('lastEdited', 'desc')) : null,
    [notesCollectionRef]
  );
  
  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <NewNoteDialog subjectId={subjectId} />
      </div>
       {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && notes?.map(note => (
        <Link key={note.id} href={`/dashboard/notes/${subjectId}/${note.id}`} className="block">
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


export default function SubjectPage() {
  const params = useParams();
  const subjectId = params.subjectId as string;
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
                <CardHeader><CardTitle>Exam Questions</CardTitle></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="syllabus" className="py-6">
            <Card className="glass-pane">
                <CardHeader><CardTitle>Syllabus</CardTitle></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="resources" className="py-6">
             <Card className="glass-pane">
                <CardHeader><CardTitle>Other Resources</CardTitle></CardHeader>
                <CardContent className="text-center text-muted-foreground py-12">Feature under construction.</CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
