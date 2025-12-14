
'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { NoteEditor } from './note-editor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from './ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface QuickNoteDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const saveNoteSchema = z.object({
  title: z.string().optional(),
  subjectId: z.string().min(1, 'Please select a subject.'),
  tags: z.string().optional(),
  saveMode: z.enum(['create', 'append']).default('create'),
  existingResourceId: z.string().optional(),
  existingResourceType: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.saveMode === 'create' && !data.title) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['title'],
            message: 'Title is required when creating a new resource.',
        });
    }
    if (data.saveMode === 'append' && !data.existingResourceId) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['existingResourceId'],
            message: 'Please select an existing item to append to.',
        });
    }
});


export function QuickNoteDrawer({ isOpen, onOpenChange }: QuickNoteDrawerProps) {
  const [content, setContent] = React.useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedSubjectForAppend, setSelectedSubjectForAppend] = React.useState<string | null>(null);
  const [existingItems, setExistingItems] = React.useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = React.useState(false);


  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [user, firestore]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection(subjectsCollectionRef);

  const form = useForm<z.infer<typeof saveNoteSchema>>({
    resolver: zodResolver(saveNoteSchema),
    defaultValues: { title: '', subjectId: '', tags: '', saveMode: 'create' },
  });

  const saveMode = form.watch('saveMode');
  const subjectId = form.watch('subjectId');

   React.useEffect(() => {
    const fetchItems = async () => {
        if (saveMode !== 'append' || !subjectId || !user) {
            setExistingItems([]);
            return;
        }
        setIsLoadingItems(true);
        const itemTypes = ['notes', 'examQuestions', 'syllabus', 'resources'];
        let allItems: any[] = [];
        for (const type of itemTypes) {
            const itemsCollectionRef = collection(firestore, 'users', user.uid, 'subjects', subjectId, type);
            const querySnapshot = await getDocs(itemsCollectionRef);
            const items = querySnapshot.docs.map(d => ({...d.data(), id: d.id, type: type }));
            allItems = [...allItems, ...items];
        }
        setExistingItems(allItems);
        setIsLoadingItems(false);
    };
    fetchItems();
   }, [subjectId, saveMode, user, firestore]);

  const handleSave = () => {
    if (!content.trim() || content.trim() === '<p></p>') {
      toast({
        variant: 'destructive',
        title: 'Empty Note',
        description: 'Cannot save an empty note.',
      });
      return;
    }
    
    // Auto-populate title from content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    const suggestedTitle = textContent.trim().split(/\s+/).slice(0, 5).join(' ');
    form.setValue('title', suggestedTitle || 'Quick Note');

    setIsSaveDialogOpen(true);
  };
  
  const processSave = async (values: z.infer<typeof saveNoteSchema>) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
    }

    try {
        if (values.saveMode === 'create') {
            const resourcesCollectionRef = collection(firestore, 'users', user.uid, 'subjects', values.subjectId, 'resources');
            const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            const newResourceDoc = await addDoc(resourcesCollectionRef, {
                title: values.title,
                blocks: [{ id: `text-${Date.now()}`, type: 'text', content }],
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                isImportant: false,
                tags: tagsArray,
            });
            toast({ title: 'Note Saved!', description: 'Your quick note has been saved as a new resource.' });
            router.push(`/dashboard/notes/${values.subjectId}/resources/${newResourceDoc.id}`);
        } else { // Append to existing
            if (!values.existingResourceId || !values.existingResourceType) return;
            const itemRef = doc(firestore, 'users', user.uid, 'subjects', values.subjectId, values.existingResourceType, values.existingResourceId);
            
            const docSnap = await getDoc(itemRef);
            if (!docSnap.exists()) throw new Error("Document not found");
            const existingData = docSnap.data();
            const existingBlocks = existingData.blocks || [];
            
            await updateDoc(itemRef, {
                blocks: [...existingBlocks, { id: `text-${Date.now()}`, type: 'text', content }],
                lastUpdated: serverTimestamp(),
            });
            toast({ title: 'Content Appended!', description: `Content was added to "${existingData.title}".`});
             router.push(`/dashboard/notes/${values.subjectId}/${values.existingResourceType}/${values.existingResourceId}`);
        }

        // Reset state and close dialogs
        setContent('');
        form.reset();
        setIsSaveDialogOpen(false);
        onOpenChange(false);
        
    } catch (error) {
      console.error("Error saving quick note:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save your note.' });
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open && content.trim() && content.trim() !== '<p></p>') {
      // Here you could add a confirmation dialog if you want to prevent accidental closing
    }
    onOpenChange(open);
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] glass-pane flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-headline">Quick Note</SheetTitle>
            <SheetDescription>
              Jot down a quick thought. You can save it as a new resource or append to an existing item.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 py-4">
            <NoteEditor value={content} onChange={setContent} />
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Close
              </Button>
            </SheetClose>
            <Button type="button" variant="glow" onClick={handleSave}>
              Save Note
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="glass-pane">
          <DialogHeader>
            <DialogTitle className="font-headline">Save Quick Note</DialogTitle>
            <DialogDescription>
             Choose where to save your note.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSave)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="saveMode"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Action</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex space-x-4"
                                >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="create" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Create new resource</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="append" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Append to existing</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {areSubjectsLoading ? (
                                <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                            ) : (
                            subjects?.map(subject => (
                                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                            ))
                            )}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {saveMode === 'create' && (
                    <>
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Resource Title</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Quick thought on..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tags"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags (optional)</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Physics, Chapter 3, Gravity" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </>
                )}
                 {saveMode === 'append' && (
                    <FormField
                        control={form.control}
                        name="existingResourceId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Append to Item</FormLabel>
                            <Select onValueChange={(value) => {
                                const [id, type] = value.split('::');
                                form.setValue('existingResourceId', id);
                                form.setValue('existingResourceType', type);
                            }} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger disabled={!subjectId || isLoadingItems}>
                                <SelectValue placeholder={
                                    !subjectId ? "Select a subject first" :
                                    isLoadingItems ? "Loading items..." : "Select an existing item"} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {isLoadingItems ? (
                                     <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                   existingItems.map(item => (
                                    <SelectItem key={item.id} value={`${item.id}::${item.type}`}>{item.title} ({item.type.slice(0,-1)})</SelectItem>
                                  ))
                                )}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit" variant="glow" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting && <Loader className="animate-spin mr-2"/>}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
