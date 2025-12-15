
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader, User, Shield, AlertTriangle, Wrench, Coffee, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function LiquidAdminPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const usersCollectionRef = useMemoFirebase(() => {
        if (!userProfile?.isAdmin) return null;
        return collection(firestore, 'users');
    }, [userProfile]);

    const usersQuery = useMemoFirebase(() => {
        if (!usersCollectionRef) return null;
        return query(usersCollectionRef, orderBy('creationTime', 'desc'));
    }, [usersCollectionRef]);
    
    const { data: users, isLoading: areUsersLoading, error: usersError } = useCollection(usersQuery);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    useEffect(() => {
        if (!isProfileLoading && userProfile && !userProfile.isAdmin) {
            router.replace('/dashboard');
        }
    }, [isProfileLoading, userProfile, router]);
    
    const handleAdminToggle = async (targetUser: any) => {
        if (!firestore) return;
        const userRef = doc(firestore, "users", targetUser.id);
        try {
            await updateDoc(userRef, {
                isAdmin: !targetUser.isAdmin
            });
            toast({
                title: "Permissions Updated",
                description: `${targetUser.displayName}'s admin status has been toggled.`,
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update user permissions.",
            });
        }
    };
    
    const handleSuspendToggle = async (targetUser: any) => {
        if (!firestore) return;
        const userRef = doc(firestore, "users", targetUser.id);
        try {
            await updateDoc(userRef, {
                isSuspended: !targetUser.isSuspended
            });
            toast({
                title: "User Status Updated",
                description: `${targetUser.displayName} has been ${!targetUser.isSuspended ? 'suspended' : 'unsuspended'}.`,
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update user status.",
            });
        }
    };

    const handleConfigToggle = async (key: string, value: boolean) => {
        if (!siteConfigRef) return;
        try {
            await setDoc(siteConfigRef, { [key]: value }, { merge: true });
        } catch (error) {
            console.error("Failed to update site config:", error);
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update site configuration."
            })
        }
    }

    const isLoading = isUserLoading || isProfileLoading || areUsersLoading || isConfigLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader className="animate-spin text-accent h-16 w-16" />
            </div>
        );
    }
    
    if (usersError) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="mt-4 font-semibold">Failed to load users</p>
                <p className="text-sm text-muted-foreground">{usersError.message}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold font-headline text-glow">Liquid Cooled | Admin</h1>
            <Card className="glass-pane border-accent/50 shadow-[0_0_15px_hsl(var(--accent)/0.5)]">
                <CardHeader>
                    <CardTitle className="font-headline text-accent">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-accent/20 hover:bg-accent/10">
                                <TableHead><User className="inline-block" /> User</TableHead>
                                <TableHead>Subscription</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-center"><Shield className="inline-block" /> Admin</TableHead>
                                <TableHead className="text-center">Suspended</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map(u => (
                                <TableRow key={u.id} className="border-accent/20 hover:bg-accent/10">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={u.photoURL} alt={u.displayName} />
                                                <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{u.displayName}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={u.plan === 'Premium' ? 'default' : 'secondary'} className={u.plan === 'Premium' ? 'bg-primary' : ''}>
                                            {u.plan || 'Free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {u.creationTime ? formatDistanceToNow(new Date(u.creationTime), { addSuffix: true }) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch
                                            checked={u.isAdmin}
                                            onCheckedChange={() => handleAdminToggle(u)}
                                            disabled={u.id === user?.uid}
                                            aria-label={`Toggle admin for ${u.displayName}`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <Switch
                                            checked={u.isSuspended}
                                            onCheckedChange={() => handleSuspendToggle(u)}
                                            disabled={u.id === user?.uid}
                                            aria-label={`Toggle suspension for ${u.displayName}`}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="glass-pane border-accent/50">
                    <CardHeader>
                        <CardTitle className="font-headline text-accent flex items-center gap-2"><Wrench/>Site Status</CardTitle>
                        <CardDescription>Manage site-wide maintenance and work-in-progress pages.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <Label htmlFor="siteWideMaintenance" className="font-semibold">Site-wide Maintenance</Label>
                            <Switch id="siteWideMaintenance" checked={siteConfig?.siteWideMaintenance} onCheckedChange={(c) => handleConfigToggle('siteWideMaintenance', c)} />
                        </div>
                        <div className="flex items-center justify-between p-3">
                            <Label htmlFor="activityWip">Activity Page (WIP)</Label>
                            <Switch id="activityWip" checked={siteConfig?.activityWip} onCheckedChange={(c) => handleConfigToggle('activityWip', c)} />
                        </div>
                         <div className="flex items-center justify-between p-3">
                            <Label htmlFor="generateWip">Generate Page (WIP)</Label>
                            <Switch id="generateWip" checked={siteConfig?.generateWip} onCheckedChange={(c) => handleConfigToggle('generateWip', c)} />
                        </div>
                         <div className="flex items-center justify-between p-3">
                            <Label htmlFor="notesWip">Notes Page (WIP)</Label>
                            <Switch id="notesWip" checked={siteConfig?.notesWip} onCheckedChange={(c) => handleConfigToggle('notesWip', c)} />
                        </div>
                         <div className="flex items-center justify-between p-3">
                            <Label htmlFor="analyzeWip">Analyze Page (WIP)</Label>
                            <Switch id="analyzeWip" checked={siteConfig?.analyzeWip} onCheckedChange={(c) => handleConfigToggle('analyzeWip', c)} />
                        </div>
                         <div className="flex items-center justify-between p-3">
                            <Label htmlFor="accountWip">Account Page (WIP)</Label>
                            <Switch id="accountWip" checked={siteConfig?.accountWip} onCheckedChange={(c) => handleConfigToggle('accountWip', c)} />
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-pane border-accent/50">
                     <CardHeader>
                        <CardTitle className="font-headline text-accent flex items-center gap-2"><Bot/>Feature Flags</CardTitle>
                        <CardDescription>Toggle premium or experimental features across the app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <Label htmlFor="premiumStyleAnalysis" className="font-semibold">Premium Style Analysis</Label>
                            <Switch id="premiumStyleAnalysis" checked={siteConfig?.premiumStyleAnalysis} onCheckedChange={(c) => handleConfigToggle('premiumStyleAnalysis', c)} />
                        </div>
                    </CardContent>
                </Card>
                 <Card className="glass-pane border-accent/50">
                     <CardHeader>
                        <CardTitle className="font-headline text-accent flex items-center gap-2"><Coffee/>Support</CardTitle>
                        <CardDescription>Manage support links and other resources.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <Button variant="glow" className="w-full" asChild>
                           <a href="https://buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer">Buy Liquid a Coffee!</a>
                       </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
