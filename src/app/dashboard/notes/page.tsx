'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Plus, Folder, Search, MoreVertical, Trash2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';


type Subject = WithId<{
  name: string;
  description: string;
  userId: string;
  createdAt: any; // Firestore Timestamp
}>;

const SubjectCard = ({ subject }: { subject: Subject }) => {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const createdAt = subject.createdAt?.toDate ? formatDistanceToNow(subject.createdAt.toDate(), { addSuffix: true }) : 'just now';

    const handleDelete = async () => {
        if (!user || !firestore) return;
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subject.id);
        // In a real app, you'd also want to delete all notes within this subject (or handle them otherwise)
        // This is a complex operation and might be better handled by a Firebase Function.
        await deleteDocumentNonBlocking(subjectDocRef);
        setIsDeleteDialogOpen(false);
    };


    return (
        <>
            <motion.div
                layout
                whileHover={{ y: -5 }}
                className="h-full"
            >
                <Card className="group glass-pane transition-all hover:border-accent overflow-hidden h-full flex flex-col justify-between">
                   <Link href={`/dashboard/notes/${subject.id}`} className="cursor-pointer h-full flex flex-col justify-between p-6">
                        <div>
                            <div className="flex items-start justify-between">
                                <Folder className="w-10 h-10 text-accent/70"/>
                            </div>
                            <CardTitle className="font-headline text-glow truncate pt-4">{subject.name || 'Untitled Subject'}</CardTitle>
                             <CardDescription className="pt-2 text-sm text-muted-foreground line-clamp-2">{subject.description}</CardDescription>
                        </div>
                        <p className="text-xs text-muted-foreground pt-4">Created {createdAt}</p>
                    </Link>
                     <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-pane">
                                 <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Card>
            </motion.div>
             <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Are you sure?</DialogTitle>
                        <DialogDescription>
                           This will permanently delete the subject "{subject.name}" and all notes and materials inside it. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

const NewSubjectDialog = ({ onSubjectCreated }: { onSubjectCreated: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const formSchema = z.object({
      name: z.string().min(1, "Subject name cannot be empty.").max(50, "Subject name is too long."),
      description: z.string().max(200, "Description is too long.").optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: { name: "", description: "" },
    });

    const subjectsRef = useMemoFirebase(() =>
        user ? collection(firestore, 'users', user.uid, 'subjects') : null
    , [firestore, user]);

    const handleCreateSubject = async (values: z.infer<typeof formSchema>) => {
        if (!user || !subjectsRef) return;

        const newSubject = {
            userId: user.uid,
            name: values.name,
            description: values.description || '',
            createdAt: serverTimestamp(),
        };

        await addDocumentNonBlocking(subjectsRef, newSubject);
        onSubjectCreated();
        setIsOpen(false);
        form.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="glow" className="w-full sm:w-auto"><Plus className="mr-2"/> New Subject</Button>
            </DialogTrigger>
            <DialogContent className="glass-pane">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateSubject)}>
                        <DialogHeader>
                            <DialogTitle className="font-headline">Create New Subject</DialogTitle>
                            <DialogDescription>
                               Choose a name for your new subject. All your notes and materials will live here.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Subject Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., Quantum Physics" {...field} />
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
                                    <Textarea placeholder="e.g., Exam on the 24th, focus on chapters 3-5." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Create Subject</Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function SubjectsDashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const subjectsRef = useMemoFirebase(() => 
        user ? collection(firestore, 'users', user.uid, 'subjects') : null, 
        [firestore, user]
    );

    const subjectsQuery = useMemoFirebase(() => 
        subjectsRef ? query(subjectsRef, orderBy('createdAt', 'desc')) : null, 
        [subjectsRef]
    );

    const { data: subjects, isLoading: isLoadingSubjects, error } = useCollection<Subject>(subjectsQuery);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredSubjects = useMemo(() => {
        if (!subjects) return [];
        return subjects.filter(subject => 
            subject.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [subjects, searchTerm]);
    
    return (
        <div className="p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-headline">Subjects</h1>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                    <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search subjects..." 
                            className="pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <NewSubjectDialog onSubjectCreated={() => {}} />
                </div>
            </div>
            
            {isLoadingSubjects && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="glass-pane h-48">
                            <CardHeader><Skeleton className="h-8 w-8" /></CardHeader>
                            <CardContent><Skeleton className="h-6 w-3/4" /></CardContent>
                            <CardFooter><Skeleton className="h-4 w-1/2" /></CardFooter>
                        </Card>
                    ))}
                 </div>
            )}
            
            {error && <div className="text-destructive">Error loading subjects: {error.message}</div>}

            {!isLoadingSubjects && filteredSubjects.length === 0 && (
                 <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg bg-card/30">
                    <BookOpen className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'No Subjects Found' : 'Create a Subject to Unlock Notes'}</h3>
                    <p className="mt-1 text-sm">{searchTerm ? 'No subjects match your search.' : 'Click "New Subject" to get started.'}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredSubjects.map((subject, index) => (
                    <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="h-full"
                    >
                        <SubjectCard subject={subject} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
