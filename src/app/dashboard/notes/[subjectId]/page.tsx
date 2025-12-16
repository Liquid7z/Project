
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Plus, Loader, AlertTriangle, FileText, ArrowLeft, MoreVertical, Sparkles, Notebook, FileQuestion, Package, Share2 } from 'lucide-react';
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
import { collection, doc, addDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ShareDialog } from '@/components/share-dialog';


const itemFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
});

const ContentList = ({ type, subjectName }: { type: 'notes' | 'examQuestions' | 'resources', subjectName?: string }) => {
    const { subjectId } = useParams<{ subjectId: string }>();
    const router = useRouter();
    const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
    const [sharingItem, setSharingItem] = useState<any | null>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const contentCollectionRef = useMemoFirebase(() => {
        if (!user || !subjectId) return null;
        return collection(firestore, 'users', user.uid, 'subjects', subjectId, type);
    }, [user, subjectId, firestore, type]);
    
    const { data: items, isLoading, error } = useCollection(contentCollectionRef);

     const form = useForm<z.infer<typeof itemFormSchema>>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: { title: '' },
    });
    
    const handleCreateItem = async (values: z.infer<typeof itemFormSchema>) => {
        if (!contentCollectionRef) return;
        try {
            const newItemDoc = await addDoc(contentCollectionRef, {
                title: values.title,
                blocks: [{ id: `text-${Date.now()}`, type: 'text', content: `<p>Start writing your new ${type.slice(0, -1)} here!</p>` }],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                isImportant: false,
            });
            toast({ title: 'Item Created', description: `New item "${values.title}" has been added.` });
            setIsNewItemDialogOpen(false);
            form.reset();
            router.push(`/dashboard/notes/${subjectId}/${type}/${newItemDoc.id}/edit`);
        } catch (error) {
            console.error(`Error creating ${type}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to create ${type.slice(0, -1)}.` });
        }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!user || !subjectId) return;
        const itemRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, type, itemId);
        try {
            await deleteDoc(itemRef);
            toast({ title: 'Item Deleted', description: 'The item has been successfully deleted.' });
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete item.` });
        }
    };

    const toggleItemImportance = async (item: any) => {
      if (!user || !subjectId) return;
      const itemRef = doc(firestore, 'users', user.uid, 'subjects', subjectId, type, item.id);
      try {
        await updateDoc(itemRef, { isImportant: !item.isImportant });
         toast({ title: 'Item Updated', description: `"${item.title}" marked as ${!item.isImportant ? 'important' : 'not important'}.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update item importance.' });
      }
    };

    const handleShareClick = (item: any) => {
        setSharingItem({ ...item, subjectId });
    };

    const typeName = {
        notes: 'Note',
        examQuestions: 'Questions & Syllabus',
        resources: 'Resource'
    }[type];

    return (
        <div className="space-y-6">
             <div className="flex items-start justify-between">
                <div className="flex-1"/>
                <Button variant="glow" onClick={() => setIsNewItemDialogOpen(true)} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New {typeName}
                </Button>
            </div>
            {isLoading && (
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
            )}
            {error && (
                <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                    <h3 className="mt-4 text-lg font-semibold">Error Loading Content</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                </Card>
            )}
            {!isLoading && items && items.length === 0 && (
                <Card className="flex flex-col items-center justify-center p-12 text-center glass-pane border-dashed">
                    <FileText className="w-16 h-16 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">This section is empty</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Add your first {typeName.toLowerCase()} to get started.</p>
                </Card>
            )}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {items && items.map((item) => {
                    const firstTextBlock = item.blocks?.find((b: any) => b.type === 'text');
                    const previewText = firstTextBlock?.content?.replace(/<[^>]+>/g, '') || 'No additional content.';

                    return (
                        <Card key={item.id} className={cn("flex flex-col glass-pane hover:border-accent transition-colors group", item.isImportant && "important-glow")}>
                            <Link href={`/dashboard/notes/${subjectId}/${type}/${item.id}`} className="flex-grow flex flex-col">
                                <CardHeader>
                                    <CardTitle className="font-headline group-hover:text-accent transition-colors">{item.title}</CardTitle>
                                    {type === 'resources' && subjectName && (
                                      <CardDescription>
                                        In subject: {subjectName}
                                      </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{previewText}</p>
                                    {type === 'resources' && item.tags && item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {item.tags.map((tag: string) => (
                                                <Badge key={tag} variant="secondary">{tag}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>
                                        {item.lastUpdated ? `Updated ${formatDistanceToNow(item.lastUpdated.toDate(), { addSuffix: true })}` : 'Not updated'}
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
                                        <DropdownMenuItem asChild><Link href={`/dashboard/notes/${subjectId}/${type}/${item.id}/edit`}>Edit</Link></DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleShareClick(item); }}>
                                            <Share2 className="mr-2 h-4 w-4"/> Share
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => toggleItemImportance(item)}>
                                            <Sparkles className={cn("mr-2 h-4 w-4", item.isImportant && "text-accent")} />
                                            Mark as Important
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">Delete</DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the item titled "{item.title}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
             <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline">Create New {typeName}</DialogTitle>
                        <DialogDescription>
                            Give your new item a title to get started. You can add content on the next page.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCreateItem)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder={`e.g., Chapter 1 ${typeName}`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" variant="glow">Create & Open</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            {sharingItem && (
                 <ShareDialog
                    isOpen={!!sharingItem}
                    onOpenChange={(isOpen) => !isOpen && setSharingItem(null)}
                    item={sharingItem}
                    itemType={type}
                />
            )}
        </div>
    );
};

export default function SubjectPage() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const subjectRef = useMemoFirebase(() => {
        if (!user || !subjectId) return null;
        return doc(firestore, 'users', user.uid, 'subjects', subjectId);
    }, [user, subjectId, firestore]);
    const { data: subject, isLoading: isSubjectLoading, error: subjectError } = useDoc(subjectRef);

    const isLoading = isUserLoading || isSubjectLoading;
    const error = subjectError;

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
                </div>
                 <div className="h-10 w-full bg-muted rounded-md animate-pulse mt-6"></div>
                 <div className="h-48 w-full bg-muted rounded-md animate-pulse mt-6"></div>
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
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
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
            </div>
            
            <Tabs defaultValue="notes" className="w-full">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList className="inline-flex w-auto">
                        <TabsTrigger value="notes"><Notebook className="w-4 h-4 mr-0 sm:mr-2"/><span className="hidden sm:inline">Notes</span></TabsTrigger>
                        <TabsTrigger value="examQuestions"><FileQuestion className="w-4 h-4 mr-0 sm:mr-2"/><span className="hidden sm:inline">Questions & Syllabus</span></TabsTrigger>
                        <TabsTrigger value="resources"><Package className="w-4 h-4 mr-0 sm:mr-2"/><span className="hidden sm:inline">Resources</span></TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <TabsContent value="notes" className="mt-6">
                    <ContentList type="notes" subjectName={subject.name} />
                </TabsContent>
                <TabsContent value="examQuestions" className="mt-6">
                    <ContentList type="examQuestions" subjectName={subject.name} />
                </TabsContent>
                <TabsContent value="resources" className="mt-6">
                    <ContentList type="resources" subjectName={subject.name} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

    