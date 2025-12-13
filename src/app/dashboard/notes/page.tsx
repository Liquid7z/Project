'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Subject = {
  id: string;
  title: string;
  description: string;
  noteCount: number;
};

const mockSubjects: Subject[] = [
  { id: 'quantum-mechanics', title: 'Quantum Mechanics', description: 'Exploring the strange world of atoms and particles.', noteCount: 3 },
  { id: 'periodic-table', title: 'The Periodic Table', description: 'Elements, their properties, and chemical behaviors.', noteCount: 1 },
  { id: 'world-war-2', title: 'World War II', description: 'A study of the global conflict from 1939-1945.', noteCount: 1 },
  { id: 'biology-101', title: 'Biology 101', description: 'The fundamentals of life and living organisms.', noteCount: 5 },
];

export default function NotesDashboardPage() {
    const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newSubjectTitle, setNewSubjectTitle] = useState('');
    const [newSubjectDescription, setNewSubjectDescription] = useState('');

    const handleCreateSubject = () => {
        if (!newSubjectTitle) return;

        const newSubject: Subject = {
            id: newSubjectTitle.toLowerCase().replace(/\s+/g, '-'),
            title: newSubjectTitle,
            description: newSubjectDescription,
            noteCount: 0,
        };

        setSubjects([newSubject, ...subjects]);
        setNewSubjectTitle('');
        setNewSubjectDescription('');
        setIsCreateDialogOpen(false);
    };

    return (
        <div className="p-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">Subjects</h1>
                <Button variant="glow" onClick={() => setIsCreateDialogOpen(true)}><Plus className="mr-2"/> Add Subject</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject, index) => (
                   <Link href={`/dashboard/notes/${subject.id}`} key={subject.id}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.03, y: -5 }}
                            className="h-full"
                        >
                            <Card className="group glass-pane transition-all h-full flex flex-col hover:border-accent">
                                <CardHeader>
                                <CardTitle className="font-headline text-glow truncate">{subject.title}</CardTitle>
                                <CardDescription>{subject.description}</CardDescription>
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
                   </Link>
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
