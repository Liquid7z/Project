
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Check, Loader, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, updateDoc, increment } from 'firebase/firestore';
import { isThisMonth, parseISO } from 'date-fns';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: any;
  itemType: 'notes' | 'examQuestions' | 'resources';
}

export function ShareDialog({ isOpen, onOpenChange, item, itemType }: ShareDialogProps) {
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const { toast } = useToast();
  const { user, firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const isPremium = userProfile?.plan === 'Premium';

  const sharesThisMonth = userProfile?.lastShareDate && isThisMonth(parseISO(userProfile.lastShareDate)) ? userProfile.sharesThisMonth || 0 : 0;
  const freeSharesLimit = 5;
  const remainingShares = isPremium ? Infinity : Math.max(0, freeSharesLimit - sharesThisMonth);


  useEffect(() => {
    if (isOpen) {
      handleCreateShareLink();
    } else {
        // Reset state when closing
        setShareLink('');
        setIsCreatingLink(false);
        setRemoveWatermark(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCreateShareLink = async () => {
    if (!user || !item) return;

    if (!isPremium && remainingShares <= 0) {
      toast({
        variant: 'destructive',
        title: 'Share Limit Reached',
        description: `You have used all your ${freeSharesLimit} free shares for this month. Upgrade to Premium for unlimited sharing.`,
      });
      onOpenChange(false);
      return;
    }

    setIsCreatingLink(true);
    try {
      const shareCollectionRef = collection(firestore, 'shared_notes');
      const shareDocRef = doc(shareCollectionRef);
      const shareId = shareDocRef.id;

      const sharedNoteData = {
        originalOwnerId: user.uid,
        originalOwnerName: user.displayName,
        originalItemId: item.id,
        originalItemType: itemType,
        originalSubjectId: item.subjectId, // Assuming subjectId is on the item
        title: item.title,
        blocks: item.blocks,
        createdAt: serverTimestamp(),
        watermarkRemoved: isPremium && removeWatermark,
      };

      await setDoc(shareDocRef, sharedNoteData);
      
      // Decrement share count for free users
      if (!isPremium && userProfileRef) {
          await updateDoc(userProfileRef, {
              sharesThisMonth: increment(1),
              lastShareDate: new Date().toISOString()
          });
      }

      const generatedLink = `${window.location.origin}/share/${shareId}`;
      setShareLink(generatedLink);
      toast({ title: 'Share Link Created!', description: 'Anyone with the link can now view a preview.' });

    } catch (error) {
      console.error("Error creating share link:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create a shareable link.' });
    } finally {
      setIsCreatingLink(false);
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({ title: 'Link Copied!' });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-pane">
        <DialogHeader>
          <DialogTitle className="font-headline">Share "{item.title}"</DialogTitle>
          <DialogDescription>
            Generate a link to share a preview of your note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isCreatingLink ? (
            <div className="flex items-center justify-center h-24">
              <Loader className="animate-spin text-accent" />
              <p className="ml-2">Generating secure link...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input id="link" value={shareLink} readOnly className="pr-10" />
                <Button type="button" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleCopyToClipboard}>
                  {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {isPremium ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                     <Crown className="w-4 h-4 text-yellow-400"/>
                    <Label htmlFor="remove-watermark">Remove "Shared by" watermark</Label>
                  </div>
                  <Switch
                    id="remove-watermark"
                    checked={removeWatermark}
                    onCheckedChange={setRemoveWatermark}
                  />
                </div>
              ) : (
                 <div className="text-sm text-muted-foreground p-3 rounded-lg border bg-secondary/30">
                    <p>You have <span className="font-bold text-accent">{remainingShares}</span> free shares remaining this month.</p>
                    <p className="text-xs mt-1">Upgrade to Premium to remove the watermark and get unlimited shares.</p>
                 </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
