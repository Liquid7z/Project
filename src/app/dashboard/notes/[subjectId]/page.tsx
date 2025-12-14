'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Plus, Loader, AlertTriangle, FileText, ArrowLeft, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const noteFormSchema = z.object({
  title: z.string().min(1, 'Note title is required.'),
});

export default function SubjectPage() {
    const params = useParams();
    const router = useRouter();
    const subjectId = params.subjectId as string;
    const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const subjectRef = useMemoFirebase(() => {
        if (!user || !subjectId) return null;
        return doc(firestore, 'users', user.uid, 'subjects', subjectId);
    }, [user, subjectId, firestore]);
    const { data: subject, isLoading: isSubjectLoading, error: subjectError } = useDoc(subjectRef);

    const notesCollectionRef = useMemoFirebase(() => {
        if (!user || !subjectId) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subjectId, 'notes');
    }, [user, subjectId, firestore]);
    const { data: notes, isLoading: areNotesLoading, error: notesError } = useCollection(notesCollectionRef);

    const form = useForm<z.infer<typeof noteFormSchema>>({
        resolver: zodResolver(noteFormSchema),
        defaultValues: { title: '' },
    });
    
    const handleCreateNote = async (values: z.infer<typeof noteFormSchema>) => {
        if (!notesCollectionRef) return;
        try {
            const newNoteDoc = await addDoc(notesCollectionRef, {
                title: values.title,
                blocks: [{ id: `text-${Date.now()}`, type: 'text', content: '<p>Start writing your new note here!</p>' }],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
            });
            toast({ title: 'Note Created', description: `Note "${values.title}" has been added.` });
            setIsNewNoteDialogOpen(false);
            form.reset();
            router.push(`/dashboard/notes/${subjectId}/${newNoteDoc.id}`);
        } catch (error) {
            console.error("Error creating note:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create note.' });
        }
    };
    
    const handleDeleteNote = async (noteId: string) => {
        if (!user || !subjectId) return;
        const noteRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, 'notes', noteId);
        try {
            await deleteDoc(noteRef);
            toast({ title: 'Note Deleted', description: 'The note has been successfully deleted.' });
        } catch (error) {
            console.error("Error deleting note:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete note.' });
        }
    };
    
    const isLoading = isUserLoading || isSubjectLoading || areNotesLoading;
    const error = subjectError || notesError;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-muted rounded-md animate-pulse"></div>
                        <div>
                            <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                            <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2"></div>
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-muted rounded-md animate-pulse"></div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                           <CardHeader>
                             <div className="h-6 w-3/4 bg-muted rounded"></div>
                           </CardHeader>
                           <CardContent>
                              <div className="space-y-2">
                                <div className="h-4 w-full bg-muted rounded"></div>
                                <div className="h-4 w-5/6 bg-muted rounded"></div>
                              </div>
                           </CardContent>
                           <CardFooter>
                                <div className="h-4 w-1/3 bg-muted rounded"></div>
                           </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                <AlertTriangle className="w-12 h-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold">Error Loading Subject</h3>
                <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                 <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard/notes">Go back to Subjects</Link>
                </Button>
            </Card>
        );
    }
    
    if (!subject) {
        return (
             <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                <FolderOpen className="w-12 h-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Subject Not Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">The subject you're looking for doesn't exist.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard/notes">Go back to Subjects</Link>
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                     <Link href="/dashboard/notes">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{subject.name}</h1>
                        <p className="text-muted-foreground">{subject.description}</p>
                    </div>
                </div>
                <Button variant="glow" onClick={() => setIsNewNoteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Note
                </Button>
            </div>

            {notes && notes.length === 0 && (
                <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane border-dashed">
                    <FileText className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">This Subject is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add your first note to get started.</p>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {notes && notes.map((note) => {
                    const firstTextBlock = note.blocks?.find((b: any) => b.type === 'text');
                    const previewText = firstTextBlock?.content?.replace(/<[^>]+>/g, '') || 'No additional content.';

                    return (
                        <Card key={note.id} className="flex flex-col glass-pane hover:border-accent transition-colors group">
                            <Link href={`/dashboard/notes/${subjectId}/${note.id}`} className="flex-grow flex flex-col">
                                <CardHeader>
                                    <CardTitle className="font-headline group-hover:text-accent transition-colors">{note.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{previewText}</p>
                                </CardContent>
                                <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>
                                        {note.lastUpdated ? `Updated ${formatDistanceToNow(note.lastUpdated.toDate(), { addSuffix: true })}` : 'Not updated'}
                                    </span>
                                </CardFooter>
                            </Link>
                             <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild><Link href={`/dashboard/notes/${subjectId}/${note.id}/edit`}>Edit</Link></DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Delete</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the note titled "{note.title}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteNote(note.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </Card>
                    );
                 })}
            </div>
            
            <Dialog open={isNewNoteDialogOpen} onOpenChange={setIsNewNoteDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Create New Note</DialogTitle>
                        <DialogDescription>
                            Give your new note a title to get started. You can add content on the next page.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateNote)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Note Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., The Last Sunset" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" variant="glow">Create & Open Note</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
