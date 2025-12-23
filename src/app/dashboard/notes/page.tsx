
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Plus, Loader, AlertTriangle, MoreVertical, Sparkles, BrainCircuit } from 'lucide-react';
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
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
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
import { WipPage } from '@/components/wip-page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SkillTreeView } from '@/components/skill-tree-view';
import { explainTopicAction } from '@/actions/generation';
import { ChatView } from '@/components/chat-view';
import type { Message } from '@/components/chat-view';
import { useRouter } from 'next/navigation';


const subjectFormSchema = z.object({
    name: z.string().min(1, 'Subject name is required.'),
});

function SubjectsView({ subjects: serverSubjects, isLoading: areSubjectsLoading, error: subjectsError }: { subjects: any[] | null, isLoading: boolean, error: Error | null }) {
    const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any | null>(null);
    const { toast } = useToast();
    const { user, firestore } = useUser();
    const router = useRouter();

    const subjectsCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [user, firestore]);

    const form = useForm<z.infer<typeof subjectFormSchema>>({
        resolver: zodResolver(subjectFormSchema),
        defaultValues: { name: '' },
    });

    const handleCreateOrUpdateSubject = async (values: z.infer<typeof subjectFormSchema>) => {
        if (editingSubject) {
            if (!user) return;
            const subjectDocRef = doc(firestore, 'users', user.uid, 'subjects', editingSubject.id);
            try {
                await updateDoc(subjectDocRef, { ...values, description: editingSubject.description || '', lastUpdated: serverTimestamp() });
                toast({ title: 'Subject Updated', description: `Subject "${values.name}" has been updated.` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update subject.' });
                console.error("Error updating subject: ", error);
            }
        } else {
            if (!subjectsCollectionRef) return;
            try {
                const newDoc = await addDoc(subjectsCollectionRef, {
                    ...values,
                    description: '',
                    noteCount: 0,
                    isImportant: false,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                });
                toast({ title: 'Subject Created', description: `Subject "${values.name}" has been created.` });
                router.push(`/dashboard/notes/${newDoc.id}`);
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
            toast({ title: 'Subject Deleted', description: 'The subject and all its content have been deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete subject.' });
            console.error("Error deleting subject: ", error);
        }
    };
    
    const openEditDialog = (subject: any) => {
        setEditingSubject(subject);
        form.reset({ name: subject.name });
        setIsNewSubjectDialogOpen(true);
    };
    
    const openNewDialog = () => {
        setEditingSubject(null);
        form.reset({ name: ''});
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
            {areSubjectsLoading && (
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
            {!areSubjectsLoading && subjectsError && (
                <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Subjects</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{subjectsError.message}</p>
                </Card>
            )}
            {!areSubjectsLoading && !subjectsError && serverSubjects && serverSubjects.length === 0 && (
                <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane border-dashed">
                    <Folder className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No Subjects Yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first subject.</p>
                </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!areSubjectsLoading && !subjectsError && serverSubjects && serverSubjects.map((subject) => (
                    <Card key={subject.id} className={cn("flex flex-col glass-pane hover:border-accent transition-colors group", subject.isImportant && 'important-glow' )}>
                        <Link href={`/dashboard/notes/${subject.id}`} className="flex-grow flex flex-col justify-between">
                            <CardHeader>
                                <div>
                                    <CardTitle className="font-headline group-hover:text-accent transition-colors">{subject.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 mt-1">{subject.description || 'No description'}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow" />
                        </Link>
                        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex-grow">
                                <span>{subject.noteCount || 0} items</span>
                                <span className="ml-4">{subject.lastUpdated ? `Updated ${formatDistanceToNow(subject.lastUpdated.toDate(), { addSuffix: true })}` : ''}</span>
                            </div>
                            <button onClick={(e) => toggleSubjectImportance(subject, e)} className="z-10 p-1 rounded-full text-muted-foreground hover:text-accent transition-colors">
                                <Sparkles className={cn("h-5 w-5", subject.isImportant && "text-accent fill-accent/50")} />
                            </button>
                        </CardFooter>
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
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <Folder className="w-16 h-16 text-muted-foreground/5 transition-all duration-300 group-hover:scale-110 group-hover:text-muted-foreground/10" />
                        </div>
                    </Card>
                ))}
            </div>
            <Dialog open={isNewSubjectDialogOpen} onOpenChange={setIsNewSubjectDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">{editingSubject ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
                        <DialogDescription>
                           {editingSubject ? `Update the name for "${editingSubject.name}".` : 'Give your new collection of notes a name.'}
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

function SkillTreeInteractiveView() {
    const [chatMessages, setChatMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const { toast } = useToast();

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim()) return;

        const newUserMessage: Message = { role: 'user', content: messageText };
        setChatMessages(prev => [...prev, newUserMessage]);
        
        setIsChatLoading(true);

        try {
          const result = await explainTopicAction({
            topic: messageText,
            history: chatMessages.filter(m => m.role === 'user' || m.role === 'model'),
          });
          const newModelMessage: Message = { role: 'model', content: result.response };
          setChatMessages(prev => [...prev, newModelMessage]);
        } catch (error) {
          console.error("Error explaining topic:", error);
          const errorMessage: Message = {
            role: 'model',
            content: 'Sorry, I encountered an error trying to respond.',
          };
          setChatMessages(prev => [...prev, errorMessage]);
          toast({
            variant: "destructive",
            title: "AI Chat Error",
            description: "Could not get a response from the AI assistant.",
          });
        } finally {
          setIsChatLoading(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(chatInput);
        setChatInput('');
    }

    return (
        <div className="grid lg:grid-cols-2 gap-6 h-full">
            <SkillTreeView onExplainInChat={handleSendMessage} />
            <Card className="glass-pane h-full flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline">AI Chat</CardTitle>
                <CardDescription>Ask for more details about any topic.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ChatView messages={chatMessages} isLoading={isChatLoading} />
                <form onSubmit={handleFormSubmit} className="p-4 border-t">
                  <div className="relative">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      className="pr-12"
                      disabled={isChatLoading}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      disabled={isChatLoading || !chatInput.trim()}
                    >
                      <Plus />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
    )
}

export default function NotesDashboardPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    const subjectsCollectionRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'subjects');
    }, [user, firestore]);
    const { data: subjects, isLoading: areSubjectsLoading, error: subjectsError } = useCollection(subjectsCollectionRef);

    const isLoading = isUserLoading || isProfileLoading || isConfigLoading || areSubjectsLoading;
    const isNotesWip = siteConfig?.notesWip === false && userProfile?.isAdmin !== true;
    const isSkillTreeWip = siteConfig?.skillTreeWip === false && userProfile?.isAdmin !== true;
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    if (isNotesWip) {
        return <WipPage />;
    }

    return (
        <Tabs defaultValue="subjects" className="h-full flex flex-col">
            <TabsList>
                <TabsTrigger value="subjects">Subjects</TabsTrigger>
                <TabsTrigger value="skill-tree" disabled={isSkillTreeWip}><BrainCircuit className="w-4 h-4 mr-2"/> Skill Tree {isSkillTreeWip ? '(WIP)' : ''}</TabsTrigger>
            </TabsList>
            <TabsContent value="subjects" className="mt-6">
                <SubjectsView subjects={subjects} isLoading={areSubjectsLoading} error={subjectsError} />
            </TabsContent>
            <TabsContent value="skill-tree" className="mt-6 flex-grow">
                 {isSkillTreeWip ? <WipPage /> : <SkillTreeInteractiveView />}
            </TabsContent>
        </Tabs>
    );
}
