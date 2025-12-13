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

type Subject = {
  id: string;
  title: string;
  description: string;
  noteCount: number;
  lastEdited: string;
  status: 'active' | 'archived';
};

const mockSubjects: Subject[] = [
  { id: 'quantum-mechanics', title: 'Quantum Mechanics', description: 'Exploring the strange world of atoms and particles.', noteCount: 3, lastEdited: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
  { id: 'periodic-table', title: 'The Periodic Table', description: 'Elements, their properties, and chemical behaviors.', noteCount: 1, lastEdited: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
  { id: 'world-war-2', title: 'World War II', description: 'A study of the global conflict from 1939-1945.', noteCount: 1, lastEdited: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
  { id: 'biology-101', title: 'Biology 101', description: 'The fundamentals of life and living organisms.', noteCount: 5, lastEdited: new Date().toISOString(), status: 'active' },
];

export default function NotesDashboardPage() {
    const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newSubjectTitle, setNewSubjectTitle] = useState('');
    const [newSubjectDescription, setNewSubjectDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const handleCreateSubject = () => {
        if (!newSubjectTitle) return;

        const newSubject: Subject = {
            id: newSubjectTitle.toLowerCase().replace(/\s+/g, '-'),
            title: newSubjectTitle,
            description: newSubjectDescription,
            noteCount: 0,
            lastEdited: new Date().toISOString(),
            status: 'active',
        };

        setSubjects([newSubject, ...subjects]);
        setNewSubjectTitle('');
        setNewSubjectDescription('');
        setIsCreateDialogOpen(false);
    };

    const handleDeleteSubject = (subjectId: string) => {
        setSubjects(subjects.filter(s => s.id !== subjectId));
    };

    const handleArchiveSubject = (subjectId: string) => {
        setSubjects(subjects.map(s => s.id === subjectId ? { ...s, status: 'archived' } : s));
    };

    const filteredAndSortedSubjects = useMemo(() => {
        return subjects
            .filter(subject => subject.status === 'active') // Only show active subjects
            .filter(subject => 
                subject.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subject.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime();
                } else {
                    return new Date(a.lastEdited).getTime() - new Date(b.lastEdited).getTime();
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
                                    <CardDescription className="mt-2">{subject.description}</CardDescription>
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
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <BookOpen className="w-4 h-4 mr-2"/>
                                    <span>{subject.noteCount} {subject.noteCount === 1 ? 'Note' : 'Notes'}</span>
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
