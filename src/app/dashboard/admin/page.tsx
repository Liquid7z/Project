'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader, Shield, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
    const { user, decodedClaims, isUserLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore || !decodedClaims?.admin) return null;
        return collection(firestore, 'users');
    }, [firestore, decodedClaims]);

    const usersQuery = useMemoFirebase(() => {
        if (!usersCollectionRef) return null;
        return query(usersCollectionRef);
    }, [usersCollectionRef]);

    const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

    if (isUserLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    if (!user || !decodedClaims?.admin) {
        router.replace('/dashboard');
        return null;
    }
    
    const isLoading = isUserLoading || areUsersLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Shield className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
                    <p className="text-muted-foreground">Manage users and app settings.</p>
                </div>
            </div>
            
            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-headline"><Users /> User Management</CardTitle>
                    <CardDescription>View and manage all registered users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <Loader className="mx-auto animate-spin" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && users?.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={u.photoURL} alt={u.displayName} />
                                                <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{u.displayName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={u.plan === 'Premium' ? 'secondary' : 'outline'}>
                                            {u.plan || 'Free'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {u.isSuspended ? (
                                            <Badge variant="destructive">Suspended</Badge>
                                        ) : (
                                            <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-400/50">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Manage</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}