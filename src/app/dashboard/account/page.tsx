'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { Check, User, CreditCard, Shield, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

const freePlanFeatures = [
    '3 handwriting generations per month',
    '1 handwriting style analysis',
    'Community support',
];

const premiumPlanFeatures = [
    'Unlimited handwriting generations',
    'Unlimited style analyses',
    'Save and export in high resolution',
    'Access to new handwriting models',
    'Priority support',
];

export default function AccountPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    if (isUserLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    if (!user) {
        router.push('/login');
        return null;
    }
    
    // This would come from user data in a real app
    const currentUserPlan = 'Free';

    return (
        <div className="grid gap-6">
            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="font-headline">Manage Your Subscription</CardTitle>
                    <CardDescription>You are currently on the {currentUserPlan} plan.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-background/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Free Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {freePlanFeatures.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" disabled={currentUserPlan === 'Free'}>
                                Current Plan
                            </Button>
                        </CardFooter>
                    </Card>
                     <Card className="border-accent bg-accent/10">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-glow">Premium Plan</CardTitle>
                            <p className="text-3xl font-bold font-headline mt-2">$10<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-foreground">
                                {premiumPlanFeatures.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-accent" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="glow" className="w-full">
                                Upgrade to Premium
                            </Button>
                        </CardFooter>
                    </Card>
                </CardContent>
            </Card>

             <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="font-headline">Account Information</CardTitle>
                </CardHeader>
                 <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-3 p-4 rounded-md bg-background/50">
                        <User className="w-5 h-5 text-accent"/>
                        <div>
                            <p className="font-semibold">Email</p>
                            <p className="text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-md bg-background/50">
                        <CreditCard className="w-5 h-5 text-accent"/>
                        <div>
                            <p className="font-semibold">Payment Method</p>
                            <p className="text-muted-foreground">Not set up</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3 p-4 rounded-md bg-background/50">
                        <Shield className="w-5 h-5 text-accent"/>
                        <div>
                            <p className="font-semibold">Password</p>
                            <Button variant="secondary" size="sm" className="h-auto px-2 py-1 mt-1">Change Password</Button>
                        </div>
                    </div>
                 </CardContent>
             </Card>
        </div>
    );
}
