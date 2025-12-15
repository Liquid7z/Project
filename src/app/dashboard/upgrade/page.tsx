
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CreditCard, Calendar, Lock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const handlePayment = async () => {
        // This is a mock payment process
        toast({
            title: "Processing Payment...",
            description: "Please wait while we process your transaction.",
        });

        // Simulate a network delay
        setTimeout(async () => {
            if (userProfileRef) {
                try {
                    await updateDoc(userProfileRef, {
                        plan: 'Premium'
                    });
                    toast({
                        title: "Upgrade Successful!",
                        description: "Welcome to Premium! You now have access to all features.",
                    });
                    router.push('/dashboard/account');
                } catch (error: any) {
                     toast({
                        variant: "destructive",
                        title: "Upgrade Failed",
                        description: "There was an error updating your plan. Please try again.",
                    });
                }
            } else {
                 toast({
                    variant: "destructive",
                    title: "Upgrade Failed",
                    description: "Could not find user profile to update.",
                });
            }
        }, 2000);
    };

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
                                <p className="text-4xl font-bold font-headline">Rs 69<span className="text-lg font-normal text-muted-foreground">/month</span></p>
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
                    <Card className="glass-pane">
                        <CardHeader>
                            <CardTitle className="font-headline">Payment Information</CardTitle>
                            <CardDescription>Enter your card details to complete the upgrade.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="card-number">Card Number</Label>
                                <div className="relative">
                                    <Input id="card-number" placeholder="0000 0000 0000 0000" />
                                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiry Date</Label>
                                     <div className="relative">
                                        <Input id="expiry" placeholder="MM / YY" />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cvc">CVC</Label>
                                     <div className="relative">
                                        <Input id="cvc" placeholder="123" />
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="card-name">Name on Card</Label>
                                <Input id="card-name" placeholder="Your Name" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="glow" className="w-full" onClick={handlePayment}>
                                Pay Rs 69
                            </Button>
                        </CardFooter>
                    </Card>
                     <p className="text-xs text-muted-foreground mt-4 text-center">
                        This is a mock payment form. No real transaction will be made.
                    </p>
                </div>
            </div>
        </div>
    );
}
