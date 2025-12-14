'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Plus, Loader, AlertTriangle, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Mock data, to be replaced with Firebase data
const mockSubjects = [
    { id: '1', name: 'Quantum Physics', description: 'Notes on superposition and entanglement.', noteCount: 5, lastUpdated: new Date() },
    { id: '2', name: 'Creative Writing', description: 'Drafts of short stories and poems.', noteCount: 12, lastUpdated: new Date(Date.now() - 86400000 * 2) },
    { id: '3', name: 'Project Phoenix', description: 'Research and development for the new engine.', noteCount: 8, lastUpdated: new Date(Date.now() - 86400000 * 5) },
];

const subjectFormSchema = z.object({
    name: z.string().min(1, 'Subject name is required.'),
    description: z.string().optional(),
});

export default function NotesDashboardPage() {
    const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = useState(false);
    const { toast } = useToast();
    
    // In a real app, these would come from useCollection
    const subjects = mockSubjects;
    const isLoading = false;
    const error = null;

    const form = useForm<z.infer<typeof subjectFormSchema>>({
        resolver: zodResolver(subjectFormSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const onSubmit = (values: z.infer<typeof subjectFormSchema>) => {
        console.log('Creating new subject:', values);
        // Here you would call a Firestore function to create the subject
        toast({ title: 'Subject Created', description: `Subject "${values.name}" has been created.` });
        setIsNewSubjectDialogOpen(false);
        form.reset();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold font-headline">My Notes</h1>
                    <p className="text-muted-foreground">Organize your thoughts by subject.</p>
                </div>
                <Button variant="glow" onClick={() => setIsNewSubjectDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Subject
                </Button>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="flex flex-col justify-between p-6 animate-pulse">
                            <div className="space-y-2">
                                <div className="h-6 w-3/4 bg-muted rounded"></div>
                                <div className="h-4 w-full bg-muted rounded"></div>
                                <div className="h-4 w-1/2 bg-muted rounded"></div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && error && (
                <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Subjects</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{error.toString()}</p>
                </Card>
            )}

            {!isLoading && !error && subjects.length === 0 && (
                <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane">
                    <Folder className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No Subjects Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first subject.</p>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!isLoading && !error && subjects.map((subject) => (
                    <Card key={subject.id} className="flex flex-col glass-pane hover:border-primary transition-colors group">
                        <Link href={`/dashboard/notes/${subject.id}`} className="flex-grow">
                            <CardHeader className="flex-row items-start justify-between">
                                <div>
                                    <CardTitle className="font-headline group-hover:text-primary transition-colors">{subject.name}</CardTitle>
                                    <CardDescription className="line-clamp-2">{subject.description}</CardDescription>
                                </div>
                                <Folder className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                            </CardHeader>
                        </Link>
                         <div className="flex items-center justify-between p-4 pt-0 text-xs text-muted-foreground">
                            <span>{subject.noteCount} notes</span>
                            <span>Updated {subject.lastUpdated.toLocaleDateString()}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={isNewSubjectDialogOpen} onOpenChange={setIsNewSubjectDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Create New Subject</DialogTitle>
                        <DialogDescription>
                            Give your new collection of notes a name and an optional description.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                            <div className="flex justify-end pt-4">
                                <Button type="submit" variant="glow">Create Subject</Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
