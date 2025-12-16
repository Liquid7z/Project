

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Calendar, Lock, Check, Loader, Send, Crown, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { motion } from 'framer-motion';

const premiumPlanFeatures = [
    'Unlimited handwriting generations',
    'Unlimited style analyses',
    'Save and export in high resolution',
    'Access to new handwriting models',
    'Priority support',
];

export default function UpgradePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [showPaymentFlow, setShowPaymentFlow] = useState(false);
    const [name, setName] = useState('');
    const [utr, setUtr] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText('i.liquid@apl');
        toast({
            title: "Copied!",
            description: "UPI ID has been copied to your clipboard.",
        });
    };

    const handleSubmitPaymentDetails = async () => {
        if (!user || !name || !utr) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in both Name and UTR/Transaction ID.' });
            return;
        }
        if (userProfile?.paymentStatus === 'pending') {
            toast({ variant: 'destructive', title: 'Request Already Pending', description: 'You already have a payment verification in progress.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const verificationRef = doc(collection(firestore, 'paymentVerifications'));
            await setDoc(verificationRef, {
                id: verificationRef.id,
                userId: user.uid,
                userName: name,
                userEmail: user.email,
                utr,
                status: 'pending',
                submittedAt: serverTimestamp(),
            });

            if (userProfileRef) {
                await updateDoc(userProfileRef, { paymentStatus: 'pending' });
            }

            toast({
                title: (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        ✨ Submission Received!
                    </motion.div>
                ),
                description: "Your upgrade request is being verified. This can take up to 24 hours.",
            });
            router.push('/dashboard/account');
        } catch (error: any) {
            console.error('Payment submission error:', error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not submit your payment details. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin" />
            </div>
        );
    }
    
    const renderPaymentInfo = () => {
        if (userProfile?.subscriptionStatus === 'active') {
            return (
                 <Card className="glass-pane">
                    <CardHeader className="items-center text-center">
                        <div className="p-3 bg-accent/20 rounded-full w-fit">
                            <Crown className="w-8 h-8 text-accent" />
                        </div>
                        <CardTitle className="font-headline text-accent">You are a Premium User!</CardTitle>
                        <CardDescription>You already have access to all premium features.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-center text-muted-foreground">
                           Your subscription is active. You can manage your subscription details from your account page.
                        </p>
                    </CardContent>
                     <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/account">Go to My Account</Link>
                        </Button>
                    </CardFooter>
                </Card>
            )
        }
        
        return (
             <>
                <Card className="glass-pane">
                    <CardHeader>
                        <CardTitle className="font-headline">Payment Information</CardTitle>
                        <CardDescription>Complete your payment and submit the details for verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <div>
                            <h3 className="text-sm font-semibold text-accent mb-2">Recommended</h3>
                             {!showPaymentFlow && (
                                <button onClick={() => setShowPaymentFlow(true)} className="w-full bg-black text-white h-10 rounded-md flex items-center justify-center font-semibold">
                                    Pay with UPI
                                </button>
                             )}
                       </div>

                        {showPaymentFlow && (
                           <div className="flex flex-col items-center gap-4 p-4 rounded-lg bg-background/50 text-center">
                               <div className="text-center">
                                   <p className="text-sm text-muted-foreground">Pay to the following UPI ID:</p>
                                   <div className="flex items-center justify-center gap-2 mt-2 p-2 rounded-md bg-background">
                                        <p className="font-mono text-lg text-accent">i.liquid@apl</p>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyToClipboard}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                   </div>
                                   <p className="font-bold text-accent mt-2">Amount: ₹9</p>
                               </div>
                               <div className="w-full space-y-4 pt-4 border-t border-border">
                                    <div className="space-y-2 text-left">
                                        <Label htmlFor="name">Your Name</Label>
                                        <Input id="name" placeholder="Enter the name used for payment" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                     <div className="space-y-2 text-left">
                                        <Label htmlFor="utr">UTR / Transaction ID</Label>
                                        <Input id="utr" placeholder="Enter the 12-digit transaction ID" value={utr} onChange={(e) => setUtr(e.target.value)} />
                                    </div>
                               </div>
                           </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button variant="glow" className="w-full" onClick={handleSubmitPaymentDetails} disabled={isSubmitting || !showPaymentFlow || !name || !utr || userProfile?.paymentStatus === 'pending'}>
                            {isSubmitting ? <Loader className="animate-spin mr-2"/> : <Send className="mr-2"/>}
                            {userProfile?.paymentStatus === 'pending' ? 'Verification Pending' : 'I have paid, Upgrade Now'}
                        </Button>
                    </CardFooter>
                </Card>
                 <p className="text-xs text-muted-foreground mt-4 text-center">
                    Your upgrade will be processed after payment verification (up to 24 hours).
                </p>
            </>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/account">
                        <ArrowLeft className="mr-2" />
                        Back to Account
                    </Link>
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                <div>
                     <Card className="glass-pane sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-glow font-headline">Premium Plan</CardTitle>
                            <CardDescription>Unlock all features and elevate your productivity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="mb-6">
                                <p className="text-4xl font-bold font-headline">Rs 9<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                            </div>
                            <ul className="space-y-3 text-sm">
                                {premiumPlanFeatures.map(feature => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <Check className="h-5 w-5 text-accent" />
                                        <span className="text-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                 <div>
                    {renderPaymentInfo()}
                </div>
            </div>
        </div>
    );
}
