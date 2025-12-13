'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Search, MoreVertical, Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { WithId } from '@/firebase/firestore/use-collection';

type Subject = WithId<{
  title: string;
  description: string;
  noteCount: number;
  lastEdited: any; // Firestore Timestamp
  status: 'active' | 'archived';
  userId: string;
}>;

export default function NotesDashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const subjectsRef = useMemoFirebase(() => 
        user ? collection(firestore, 'users', user.uid, 'subjects') : null, 
        [firestore, user]
    );

    const subjectsQuery = useMemoFirebase(() => 
        subjectsRef ? query(subjectsRef, orderBy('lastEdited', 'desc')) : null, 
        [subjectsRef]
    );

    const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newSubjectTitle, setNewSubjectTitle] = useState('');
    const [newSubjectDescription, setNewSubjectDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const handleCreateSubject = async () => {
        if (!newSubjectTitle || !user || !subjectsRef) return;

        const newSubject = {
            userId: user.uid,
            title: newSubjectTitle,
            description: newSubjectDescription,
            noteCount: 0,
            lastEdited: serverTimestamp(),
            status: 'active' as const,
        };

        await addDocumentNonBlocking(subjectsRef, newSubject);
        
        setNewSubjectTitle('');
        setNewSubjectDescription('');
        setIsCreateDialogOpen(false);
    };

    const handleDeleteSubject = async (subjectId: string) => {
        if (!user || !firestore) return;
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId);
        await deleteDocumentNonBlocking(subjectDocRef);
        // In a real app, you might want to delete all notes under this subject as well
    };

    const handleArchiveSubject = async (subjectId: string) => {
        if (!user || !firestore) return;
        const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', subjectId);
        await updateDocumentNonBlocking(subjectDocRef, { status: 'archived', lastEdited: serverTimestamp() });
    };

    const filteredAndSortedSubjects = useMemo(() => {
        if (!subjects) return [];
        return subjects
            .filter(subject => subject.status === 'active')
            .filter(subject => 
                subject.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subject.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const timeA = a.lastEdited?.toDate ? a.lastEdited.toDate().getTime() : 0;
                const timeB = b.lastEdited?.toDate ? b.lastEdited.toDate().getTime() : 0;
                if (sortBy === 'newest') {
                    return timeB - timeA;
                } else {
                    return timeA - timeB;
                }
            });
    }, [subjects, searchTerm, sortBy]);

    return (
        <div className="p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-headline">Subjects</h1>
                <div className="flex items-center gap-2">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search subjects..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Last Edited (Newest)</SelectItem>
                            <SelectItem value="oldest">Last Edited (Oldest)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="glow" onClick={() => setIsCreateDialogOpen(true)}><Plus className="mr-2"/> Add Subject</Button>
                </div>
            </div>
            
            {isLoadingSubjects && <p>Loading subjects...</p>}

            {!isLoadingSubjects && filteredAndSortedSubjects.length === 0 && (
                 <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
                    <BookOpen className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Subjects Yet</h3>
                    <p className="mt-1 text-sm">Click "Add Subject" to get started.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedSubjects.map((subject, index) => (
                    <motion.div
                        key={subject.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="h-full"
                    >
                        <Card className="group glass-pane transition-all h-full flex flex-col hover:border-accent">
                            <CardHeader className="relative">
                                <Link href={`/dashboard/notes/${subject.id}`} className="block">
                                    <CardTitle className="font-headline text-glow truncate">{subject.title}</CardTitle>
                                    <CardDescription className="mt-2 h-10 overflow-hidden text-ellipsis">{subject.description}</CardDescription>
                                </Link>
                                <div className="absolute top-4 right-4">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="glass-pane">
                                            <DropdownMenuItem onClick={() => handleArchiveSubject(subject.id)}>
                                                <Archive className="mr-2 h-4 w-4" />
                                                <span>Archive</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteSubject(subject.id)} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1"></CardContent>
                            <CardFooter>
                                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                    <div className="flex items-center">
                                        <BookOpen className="w-4 h-4 mr-2"/>
                                        <span>{subject.noteCount || 0} {subject.noteCount === 1 ? 'Note' : 'Notes'}</span>
                                    </div>
                                    <span>Edited {subject.lastEdited?.toDate ? new Date(subject.lastEdited.toDate()).toLocaleDateString() : 'recently'}</span>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Create New Subject</DialogTitle>
                        <DialogDescription>
                            Enter a title and an optional description for your new subject.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title
                            </Label>
                            <Input
                                id="title"
                                value={newSubjectTitle}
                                onChange={(e) => setNewSubjectTitle(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g. Quantum Physics"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">
                                Description
                            </Label>
                             <Textarea
                                id="description"
                                value={newSubjectDescription}
                                onChange={(e) => setNewSubjectDescription(e.target.value)}
                                className="col-span-3"
                                placeholder="A brief summary of the subject"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button variant="glow" onClick={handleCreateSubject}>Create Subject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
