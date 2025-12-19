
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader, AlertTriangle, Folder, FileText } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function UserDataViewer({ userId }: { userId: string }) {
    const { firestore } = useFirestore();

    const userProfileRef = useMemoFirebase(() => doc(firestore, 'users', userId), [firestore, userId]);
    const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc(userProfileRef);

    const subjectsCollectionRef = useMemoFirebase(() => collection(firestore, 'users', userId, 'subjects'), [firestore, userId]);
    const { data: subjects, isLoading: areSubjectsLoading, error: subjectsError } = useCollection(subjectsCollectionRef);

    const isLoading = isProfileLoading || areSubjectsLoading;
    const error = profileError || subjectsError;

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin text-accent" /></div>;
    }

    if (error) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                <AlertTriangle className="w-12 h-12 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold">Error Loading User Data</h3>
                <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
            </Card>
        );
    }
    
    if (!userProfile) {
         return (
            <Card className="flex flex-col items-center justify-center p-8 text-center glass-pane">
                <AlertTriangle className="w-12 h-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">User Not Found</h3>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="glass-pane">
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-accent">
                        <AvatarImage src={userProfile.photoURL} />
                        <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="font-headline text-2xl">{userProfile.displayName}</CardTitle>
                        <CardDescription>{userProfile.email}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex flex-col">
                        <span className="font-semibold">Plan</span>
                        <Badge variant={userProfile.plan === 'Premium' ? 'default' : 'secondary'} className="w-fit">{userProfile.plan || 'Free'}</Badge>
                    </div>
                     <div className="flex flex-col">
                        <span className="font-semibold">Joined</span>
                        <span className="text-muted-foreground">{userProfile.creationTime ? format(new Date(userProfile.creationTime), 'PPP') : 'N/A'}</span>
                    </div>
                     <div className="flex flex-col">
                        <span className="font-semibold">Last Sign In</span>
                        <span className="text-muted-foreground">{userProfile.lastSignInTime ? format(new Date(userProfile.lastSignInTime), 'PPP p') : 'N/A'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-pane">
                 <CardHeader>
                    <CardTitle className="font-headline">User Subjects & Notes</CardTitle>
                    <CardDescription>Browse through the user's created content.</CardDescription>
                </CardHeader>
                <CardContent>
                    {subjects && subjects.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {subjects.map(subject => (
                                <AccordionItem value={subject.id} key={subject.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Folder className="h-5 w-5 text-accent"/>
                                            <span className="font-semibold">{subject.name}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6">
                                        <SubjectContentViewer userId={userId} subjectId={subject.id}/>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                         <div className="text-center p-8 text-muted-foreground">
                            <Folder className="mx-auto h-12 w-12 text-muted-foreground/50"/>
                            <p className="mt-4">This user has not created any subjects yet.</p>
                       </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SubjectContentViewer({ userId, subjectId }: { userId: string, subjectId: string }) {
    const { firestore } = useFirestore();

    const notesCollectionRef = useMemoFirebase(() => collection(firestore, 'users', userId, 'subjects', subjectId, 'notes'), [firestore, userId, subjectId]);
    const { data: notes, isLoading: areNotesLoading } = useCollection(notesCollectionRef);

    const questionsCollectionRef = useMemoFirebase(() => collection(firestore, 'users', userId, 'subjects', subjectId, 'examQuestions'), [firestore, userId, subjectId]);
    const { data: questions, isLoading: areQuestionsLoading } = useCollection(questionsCollectionRef);
    
    const resourcesCollectionRef = useMemoFirebase(() => collection(firestore, 'users', userId, 'subjects', subjectId, 'resources'), [firestore, userId, subjectId]);
    const { data: resources, isLoading: areResourcesLoading } = useCollection(resourcesCollectionRef);

    const isLoading = areNotesLoading || areQuestionsLoading || areResourcesLoading;

    const allContent = [
        ...(notes || []).map(n => ({ ...n, type: 'Note' })),
        ...(questions || []).map(q => ({ ...q, type: 'Question' })),
        ...(resources || []).map(r => ({ ...r, type: 'Resource' }))
    ];

    if (isLoading) {
        return <div className="flex items-center text-sm text-muted-foreground"><Loader className="w-4 h-4 mr-2 animate-spin"/>Loading content...</div>
    }

    if (allContent.length === 0) {
        return <p className="text-sm text-muted-foreground">This subject is empty.</p>
    }

    return (
        <div className="space-y-2">
            {allContent.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                         <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                             <p className="text-sm font-medium">{item.title}</p>
                             <p className="text-xs text-muted-foreground">{item.type}</p>
                        </div>
                    </div>
                     {/* In a future step, you could add a button to view the full note content */}
                </div>
            ))}
        </div>
    )
}

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
    const { userId } = params;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/liquid">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Admin Panel
                    </Button>
                </Link>
            </div>
            <UserDataViewer userId={userId} />
        </div>
    );
}
