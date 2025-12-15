
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { Check, User, CreditCard, Shield, Loader, MailCheck, AlertTriangle, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { WipPage } from '@/components/wip-page';

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
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    const isLoading = isUserLoading || isProfileLoading || isConfigLoading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    if (!user) {
        // This case should be handled by the layout, but as a fallback
        router.push('/login');
        return null;
    }

    const isAdmin = userProfile?.isAdmin === true;
    const isWip = siteConfig?.accountWip === false && !isAdmin;

    if (isWip) {
        return <WipPage />;
    }

    // This would come from user data in a real app
    const currentUserPlan = 'Free';

    const handleVerifyEmail = async () => {
        if (!user) return;
        try {
            await sendEmailVerification(user);
            toast({
                title: "Verification Email Sent",
                description: "A verification link has been sent to your email address. Please check your inbox.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error Sending Verification",
                description: error.message,
            });
        }
    };

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
                 <CardContent className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <User className="w-5 h-5 text-accent mt-1"/>
                        <div>
                            <p className="font-semibold">Email</p>
                            <p className="text-muted-foreground">{user.email}</p>
                            {user.emailVerified ? (
                                <div className="flex items-center gap-1 text-xs text-green-400 mt-2">
                                    <MailCheck className="w-3 h-3" />
                                    <span>Verified</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 text-xs text-amber-400">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Not Verified</span>
                                    </div>
                                    <Button variant="secondary" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={handleVerifyEmail}>Verify Now</Button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <Phone className="w-5 h-5 text-accent mt-1"/>
                        <div>
                            <p className="font-semibold">Phone Number</p>
                            {user.phoneNumber ? (
                                <p className="text-muted-foreground">{user.phoneNumber}</p>
                            ) : (
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-xs text-muted-foreground">Not set</p>
                                    <Button variant="secondary" size="sm" className="h-auto px-2 py-0.5 text-xs">Add Phone</Button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <Shield className="w-5 h-5 text-accent mt-1"/>
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
