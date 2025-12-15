
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Plus, Loader, AlertTriangle, MoreVertical, Sparkles, Network } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillTreeView } from '@/components/skill-tree-view';


const subjectFormSchema = z.object({
    name: z.string().min(1, 'Subject name is required.'),
    description: z.string().optional(),
});

export default function NotesDashboardPage() {
    const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any | null>(null);
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const subjectsCollectionRef = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [user, firestore]);

    const { data: subjects, isLoading: areSubjectsLoading, error: subjectsError } = useCollection(subjectsCollectionRef);

    const form = useForm<z.infer<typeof subjectFormSchema>>({
        resolver: zodResolver(subjectFormSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const handleCreateOrUpdateSubject = async (values: z.infer<typeof subjectFormSchema>) => {
        if (editingSubject) { // Update existing subject
            if (!user) return;
            const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', editingSubject.id);
            try {
                await updateDoc(subjectDocRef, { ...values, lastUpdated: serverTimestamp() });
                toast({ title: 'Subject Updated', description: `Subject "${values.name}" has been updated.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update subject.' });
                console.error("Error updating subject: ", error);
            }
        } else { // Create new subject
            if (!subjectsCollectionRef) return;
            try {
                await addDoc(subjectsCollectionRef, {
                    ...values,
                    noteCount: 0,
                    isImportant: false,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                });
                toast({ title: 'Subject Created', description: `Subject "${values.name}" has been created.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to create subject.' });
                console.error("Error creating subject: ", error);
            }
        }
        closeDialog();
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (!user) return;
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId);
        try {
            await deleteDoc(subjectDocRef);
            toast({ title: 'Subject Deleted', description: 'The subject and all its notes have been deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete subject.' });
            console.error("Error deleting subject: ", error);
        }
    };
    
    const openEditDialog = (subject: any) => {
        setEditingSubject(subject);
        form.reset({ name: subject.name, description: subject.description });
        setIsNewSubjectDialogOpen(true);
    };
    
    const openNewDialog = () => {
        setEditingSubject(null);
        form.reset({ name: '', description: '' });
        setIsNewSubjectDialogOpen(true);
    };

    const closeDialog = () => {
        setIsNewSubjectDialogOpen(false);
        setEditingSubject(null);
        form.reset();
    };

    const toggleSubjectImportance = async (subject: any, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!user) return;
      const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subject.id);
      try {
        await updateDoc(subjectDocRef, { isImportant: !subject.isImportant });
        toast({ title: 'Subject Updated', description: `"${subject.name}" marked as ${!subject.isImportant ? 'important' : 'not important'}.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update subject importance.' });
      }
    };
    
    const isLoading = isUserLoading || areSubjectsLoading;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold font-headline">My Notes</h1>
                    <p className="text-muted-foreground">Organize your thoughts by subject.</p>
                </div>
                <Button variant="glow" onClick={openNewDialog} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Subject
                </Button>
            </div>
             <Tabs defaultValue="list-view" className="w-full">
                <TabsList>
                    <TabsTrigger value="list-view"><Folder className="w-4 h-4 mr-2"/>List View</TabsTrigger>
                    <TabsTrigger value="skill-tree"><Network className="w-4 h-4 mr-2"/>Skill Tree</TabsTrigger>
                </TabsList>
                <TabsContent value="list-view" className="mt-6">
                    {isLoading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="flex-row items-start justify-between">
                                        <div>
                                            <div className="h-6 w-3/4 bg-muted rounded mb-2"></div>
                                            <div className="h-4 w-full bg-muted rounded"></div>
                                        </div>
                                        <div className="w-8 h-8 bg-muted rounded"></div>
                                    </CardHeader>
                                    <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="h-4 w-1/4 bg-muted rounded"></div>
                                        <div className="h-4 w-1/3 bg-muted rounded"></div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}

                    {!isLoading && subjectsError && (
                        <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                            <AlertTriangle className="w-12 h-12 text-destructive" />
                            <h3 className="mt-4 text-lg font-semibold">Error Loading Subjects</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{subjectsError.message}</p>
                        </Card>
                    )}

                    {!isLoading && !subjectsError && subjects && subjects.length === 0 && (
                        <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane border-dashed">
                            <Folder className="w-16 h-16 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">No Subjects Yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first subject.</p>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {!isLoading && !subjectsError && subjects && subjects.map((subject) => (
                            <Card key={subject.id} className={cn("flex flex-col glass-pane hover:border-accent transition-colors group", subject.isImportant && 'important-glow' )}>
                                <Link href={`/dashboard/notes/${subject.id}`} className="flex-grow flex flex-col justify-between">
                                    <CardHeader>
                                        <div>
                                            <CardTitle className="font-headline group-hover:text-accent transition-colors">{subject.name}</CardTitle>
                                            <CardDescription className="line-clamp-2 mt-1">{subject.description || 'No chapter name'}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{subject.noteCount || 0} items</span>
                                        <span>{subject.lastUpdated ? `Updated ${formatDistanceToNow(subject.lastUpdated.toDate(), { addSuffix: true })}` : ''}</span>
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
                                            <DropdownMenuItem onClick={() => openEditDialog(subject)}>Edit</DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Delete</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the subject "{subject.name}" and all notes inside it. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)} className="bg-destructive hover:bg-destructive/90">Delete Subject</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <button onClick={(e) => toggleSubjectImportance(subject, e)} className="absolute bottom-4 right-4 z-10 p-1 rounded-full text-muted-foreground hover:text-accent transition-colors">
                                    <Sparkles className={cn("h-5 w-5", subject.isImportant && "text-accent fill-accent/50")} />
                                </button>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <Folder className="w-16 h-16 text-muted-foreground/5 transition-all duration-300 group-hover:scale-110 group-hover:text-muted-foreground/10" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
                 <TabsContent value="skill-tree" className="mt-6">
                    <SkillTreeView subjects={subjects || []} />
                 </TabsContent>
            </Tabs>
            

            <Dialog open={isNewSubjectDialogOpen} onOpenChange={setIsNewSubjectDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">{editingSubject ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
                        <DialogDescription>
                           {editingSubject ? `Update the details for "${editingSubject.name}".` : 'Give your new collection of notes a name and an optional description.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateOrUpdateSubject)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Creative Writing" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="e.g., A collection of short stories and poems." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost" onClick={closeDialog}>Cancel</Button>
                                </DialogClose>
                                <Button type="submit" variant="glow" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {editingSubject ? 'Save Changes' : 'Create Subject'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
