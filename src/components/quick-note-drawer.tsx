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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

interface QuickNoteDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const saveNoteSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  tags: z.string().optional(),
});

export function QuickNoteDrawer({ isOpen, onOpenChange }: QuickNoteDrawerProps) {
  const [content, setContent] = React.useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const subjectsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'subjects');
  }, [user, firestore]);

  const { data: subjects, isLoading: areSubjectsLoading } = useCollection(subjectsCollectionRef);

  const form = useForm<z.infer<typeof saveNoteSchema>>({
    resolver: zodResolver(saveNoteSchema),
    defaultValues: { title: '', subjectId: '', tags: '' },
  });

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
    const resourcesCollectionRef = collection(firestore, 'users', user.uid, 'subjects', values.subjectId, 'resources');
    try {
      const tagsArray = values.tags ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      
      const newResourceDoc = await addDoc(resourcesCollectionRef, {
        title: values.title,
        blocks: [{ id: `text-${Date.now()}`, type: 'text', content }],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        isImportant: false,
        tags: tagsArray,
      });
      toast({ title: 'Note Saved!', description: 'Your quick note has been saved to Other Resources.' });
      
      // Reset state and close dialogs
      setContent('');
      form.reset();
      setIsSaveDialogOpen(false);
      onOpenChange(false);
      
      // Navigate to the new resource
      router.push(`/dashboard/notes/${values.subjectId}/resources/${newResourceDoc.id}`);

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
              Jot down a quick thought. You can save it to a subject later.
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
              Choose a subject and give your new resource a title.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSave)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject to save to" />
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
