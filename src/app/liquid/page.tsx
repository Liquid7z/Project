
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, collectionGroup, updateDoc, getDoc, query } from 'firebase/firestore';
import { Loader, Users, ToggleRight, Shield, AlertTriangle, Notebook, FileText, Settings, Construction } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type AppConfig = {
    features: {
        [key: string]: {
            enabled: boolean;
            maintenance: boolean;
        }
    }
}

const FeatureToggle = ({ featureName, config, onToggle }: { featureName: string, config: { enabled: boolean, maintenance: boolean }, onToggle: (type: 'enabled' | 'maintenance', value: boolean) => void }) => (
    <Card className="p-4 bg-background/50">
        <div className="flex justify-between items-center">
            <p className="capitalize font-medium">{featureName.replace(/-/g, ' ')}</p>
            <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                    <Label htmlFor={`${featureName}-enabled`}>Enabled</Label>
                    <Switch
                        id={`${featureName}-enabled`}
                        checked={config.enabled}
                        onCheckedChange={(value) => onToggle('enabled', value)}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Label htmlFor={`${featureName}-maintenance`}>Maintenance</Label>
                    <Switch
                        id={`${featureName}-maintenance`}
                        checked={config.maintenance}
                        onCheckedChange={(value) => onToggle('maintenance', value)}
                    />
                </div>
            </div>
        </div>
    </Card>
);

const UserTable = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const { data: users, isLoading, error } = useCollection(usersRef);

    const handleToggleAdmin = async (userId: string) => {
        const userRef = doc(firestore, 'users', userId);
        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const currentIsAdmin = !!userSnap.data().isAdmin;
                await updateDoc(userRef, { isAdmin: !currentIsAdmin });
                toast({
                    title: "Admin Status Updated",
                    description: `User has been ${!currentIsAdmin ? 'granted' : 'revoked'} admin privileges.`,
                });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to update admin status." });
        }
    };
    
    if (isLoading) return <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /></div>;
    if (error) return <div className="text-destructive p-8">Error loading users: {error.message}</div>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users?.map(user => (
                    <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell><Badge variant={user.plan === 'Premium' ? 'default' : 'secondary'}>{user.plan || 'Free'}</Badge></TableCell>
                        <TableCell>{user.creationTime ? format(new Date(user.creationTime), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                        <TableCell>{user.isAdmin ? <Badge variant="default">Admin</Badge> : <Badge variant="outline">User</Badge>}</TableCell>
                        <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleToggleAdmin(user.id)}>
                                        {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default function LiquidAdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const appConfigRef = useMemoFirebase(() => doc(firestore, 'appConfig', 'features'), [firestore]);
    const { data: appConfig, isLoading: isConfigLoading, error: configError } = useDoc<AppConfig>(appConfigRef);
    
    const subjectsQuery = useMemoFirebase(() => (userProfile?.isAdmin ? query(collectionGroup(firestore, 'subjects')) : null), [firestore, userProfile]);
    const { data: allSubjects, isLoading: areSubjectsLoading } = useCollection(subjectsQuery);

    const notesQuery = useMemoFirebase(() => (userProfile?.isAdmin ? query(collectionGroup(firestore, 'notes')) : null), [firestore, userProfile]);
    const { data: allNotes, isLoading: areNotesLoading } = useCollection(notesQuery);

    const isLoading = isUserLoading || isProfileLoading || isConfigLoading;

    useEffect(() => {
        // Wait until all loading is finished before checking permissions
        if (!isLoading) {
            if (!user || !userProfile?.isAdmin) {
                router.replace('/dashboard');
            }
        }
    }, [user, userProfile, isLoading, router]);

    const handleFeatureToggle = async (featureName: string, type: 'enabled' | 'maintenance', value: boolean) => {
        if (!appConfigRef) return;
        try {
            await updateDoc(appConfigRef, {
                [`features.${featureName}.${type}`]: value
            });
            toast({
                title: "Feature Updated",
                description: `${featureName} ${type} status set to ${value}.`
            });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to update feature toggle." });
        }
    };


    if (isLoading || !userProfile?.isAdmin) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    const featureNames = appConfig?.features ? Object.keys(appConfig.features) : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Shield /> Admin Section</h1>
                    <p className="text-muted-foreground">App monitoring and management dashboard.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isUserLoading ? <Loader className="animate-spin" /> : '...'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                        <Notebook className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{areSubjectsLoading ? <Loader className="animate-spin" /> : allSubjects?.length ?? '0'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{areNotesLoading ? <Loader className="animate-spin" /> : allNotes?.length ?? '0'}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users">
                <TabsList>
                    <TabsTrigger value="users"><Users className="mr-2" /> Users</TabsTrigger>
                    <TabsTrigger value="features"><ToggleRight className="mr-2" /> Features</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UserTable />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="features" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Settings /> Feature Toggles</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {configError && <div className="text-destructive">Error loading feature config: {configError.message}</div>}
                             {isConfigLoading ? <div className="flex items-center justify-center p-8"><Loader className="animate-spin" /></div>
                              : featureNames.length > 0 ? (
                                featureNames.map(name => (
                                    <FeatureToggle
                                        key={name}
                                        featureName={name}
                                        config={appConfig.features[name]}
                                        onToggle={(type, value) => handleFeatureToggle(name, type, value)}
                                    />
                                ))
                             ) : <p>No feature configurations found.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
