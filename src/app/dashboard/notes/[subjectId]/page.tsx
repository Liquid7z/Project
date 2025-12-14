'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Plus, Loader, AlertTriangle, FileText, ArrowLeft, MoreVertical, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

// Mock data
const mockSubject = { id: '1', name: 'Creative Writing', description: 'Drafts of short stories and poems.' };
const mockNotes = [
    { id: 'n1', title: 'The Last Sunset', preview: 'The sky bled orange and purple as the last sun...', lastUpdated: new Date(Date.now() - 3600000) },
    { id: 'n2', title: 'Cyber-Noir Poem', preview: 'Rain-slicked chrome, neon signs flicker and die...', lastUpdated: new Date(Date.now() - 86400000) },
    { id: 'n3', title: 'Character Ideas', preview: 'A retired android who runs a flower shop. A space pirate with a fear of heights.', lastUpdated: new Date(Date.now() - 86400000 * 3) },
];

const noteFormSchema = z.object({
  title: z.string().min(1, 'Note title is required.'),
});

export default function SubjectPage() {
    const params = useParams();
    const subjectId = params.subjectId as string;
    const [isNewNoteDialogOpen, setIsNewNoteDialogOpen] = useState(false);
    const { toast } = useToast();

    // In a real app, these would come from useDoc and useCollection
    const subject = mockSubject;
    const notes = mockNotes;
    const isLoading = false;
    const error = null;

    const form = useForm<z.infer<typeof noteFormSchema>>({
        resolver: zodResolver(noteFormSchema),
        defaultValues: { title: '' },
    });

    const onSubmit = (values: z.infer<typeof noteFormSchema>) => {
        console.log('Creating new note:', values, 'in subject:', subjectId);
        toast({ title: 'Note Created', description: `Note "${values.title}" has been added to ${subject.name}.` });
        setIsNewNoteDialogOpen(false);
        form.reset();
        // In a real app, you might want to redirect to the new note's edit page
    };

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
                        {isLoading && <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>}
                        {!isLoading && subject && <h1 className="text-3xl font-bold font-headline">{subject.name}</h1>}
                        {!isLoading && subject && <p className="text-muted-foreground">{subject.description}</p>}
                    </div>
                </div>
                <Button variant="glow" onClick={() => setIsNewNoteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Note
                </Button>
            </div>

            {isLoading && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                <div className="h-4 w-1/4 bg-muted rounded"></div>
                           </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && error && (
                <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Notes</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{error.toString()}</p>
                </Card>
            )}

            {!isLoading && !error && notes.length === 0 && (
                <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane border-dashed">
                    <FileText className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">This Subject is Empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add your first note to get started.</p>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {!isLoading && !error && notes.map((note) => (
                    <Card key={note.id} className="flex flex-col glass-pane hover:border-accent transition-colors group">
                        <Link href={`/dashboard/notes/${subjectId}/${note.id}`} className="flex-grow flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline group-hover:text-accent transition-colors">{note.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{note.preview}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Updated {formatDistanceToNow(note.lastUpdated, { addSuffix: true })}</span>
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
                                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Card>
                ))}
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                            <div className="flex justify-end pt-4">
                                <Button type="submit" variant="glow">Create & Open Note</Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}