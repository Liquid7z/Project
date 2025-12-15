

'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader, User, Shield, AlertTriangle, Wrench, Coffee, Bot, Network, StickyNote, Notebook, ScanLine, DollarSign, Settings, Save, CheckCircle, XCircle, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


type PlanConfig = {
    id?: 'free' | 'premium';
    priceMonthly?: number;
    priceYearly?: number;
    subjectLimit?: number;
    notesPerSubjectLimit?: number;
    docUploadLimit?: number;
    storageLimitMb?: number;
    dailyAiUsageLimit?: number;
    dailySkillTreeLimit?: number;
    featureAdvancedSkillTree?: boolean;
    featureWhiteboardNotes?: boolean;
    featurePdfPagePreview?: boolean;
    featureDocSearch?: boolean;
    featureAiSummaries?: boolean;
    featureOfflineAccess?: boolean;
    featureExport?: boolean;
    featureGamingThemes?: boolean;
};


function PlanConfigForm({ planId, planData, onSave }: { planId: 'free' | 'premium', planData: PlanConfig | null, onSave: (planId: string, data: PlanConfig) => void }) {
    const [config, setConfig] = useState<PlanConfig>({});
    const { toast } = useToast();

    useEffect(() => {
        if (planData) {
            setConfig(planData);
        } else {
            // Set default empty state for a new config
            setConfig({
                priceMonthly: 0,
                priceYearly: 0,
                subjectLimit: 0,
                notesPerSubjectLimit: 0,
                docUploadLimit: 0,
                storageLimitMb: 0,
                dailyAiUsageLimit: 0,
                dailySkillTreeLimit: 0,
                featureAdvancedSkillTree: false,
                featureWhiteboardNotes: false,
                featurePdfPagePreview: false,
                featureDocSearch: false,
                featureAiSummaries: false,
                featureOfflineAccess: false,
                featureExport: false,
                featureGamingThemes: false,
            });
        }
    }, [planData]);

    const handleNumericChange = (key: keyof PlanConfig, value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            setConfig(prev => ({ ...prev, [key]: numValue }));
        }
    };
    
    const handleToggleChange = (key: keyof PlanConfig, checked: boolean) => {
        setConfig(prev => ({ ...prev, [key]: checked }));
    };

    const handleSave = () => {
        onSave(planId, config);
        toast({ title: 'Configuration Saved', description: `The settings for the ${planId} plan have been updated.` });
    };

    const isPremium = planId === 'premium';

    return (
        <Card className="glass-pane">
            <CardHeader>
                <CardTitle className="font-headline capitalize">{planId} Plan Settings</CardTitle>
                <CardDescription>Configure the limits and features for the {planId} plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isPremium && (
                     <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor={`${planId}-price-monthly`}>Monthly Price ($)</Label>
                           <Input id={`${planId}-price-monthly`} type="number" value={config.priceMonthly || ''} onChange={(e) => handleNumericChange('priceMonthly', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${planId}-price-yearly`}>Yearly Price ($)</Label>
                            <Input id={`${planId}-price-yearly`} type="number" value={config.priceYearly || ''} onChange={(e) => handleNumericChange('priceYearly', e.target.value)} />
                        </div>
                     </div>
                )}
                
                 <h4 className="font-bold text-accent">Usage Limits</h4>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="space-y-2">
                         <Label htmlFor={`${planId}-subject-limit`}>Subject Limit</Label>
                         <Input id={`${planId}-subject-limit`} type="number" value={config.subjectLimit ?? ''} onChange={(e) => handleNumericChange('subjectLimit', e.target.value)} />
                     </div>
                     <div className="space-y-2">
                         <Label htmlFor={`${planId}-notes-limit`}>Notes per Subject</Label>
                         <Input id={`${planId}-notes-limit`} type="number" value={config.notesPerSubjectLimit ?? ''} onChange={(e) => handleNumericChange('notesPerSubjectLimit', e.target.value)} />
                     </div>
                     <div className="space-y-2">
                         <Label htmlFor={`${planId}-doc-upload-limit`}>Document Uploads</Label>
                         <Input id={`${planId}-doc-upload-limit`} type="number" value={config.docUploadLimit ?? ''} onChange={(e) => handleNumericChange('docUploadLimit', e.target.value)} />
                     </div>
                      <div className="space-y-2">
                         <Label htmlFor={`${planId}-storage-limit`}>Storage Limit (MB)</Label>
                         <Input id={`${planId}-storage-limit`} type="number" value={config.storageLimitMb ?? ''} onChange={(e) => handleNumericChange('storageLimitMb', e.target.value)} />
                     </div>
                     <div className="space-y-2">
                         <Label htmlFor={`${planId}-ai-limit`}>Daily AI Usage</Label>
                         <Input id={`${planId}-ai-limit`} type="number" value={config.dailyAiUsageLimit ?? ''} onChange={(e) => handleNumericChange('dailyAiUsageLimit', e.target.value)} />
                     </div>
                      <div className="space-y-2">
                         <Label htmlFor={`${planId}-skill-tree-limit`}>Skill Tree Credits (per day)</Label>
                         <Input id={`${planId}-skill-tree-limit`} type="number" placeholder="-1 for unlimited" value={config.dailySkillTreeLimit ?? ''} onChange={(e) => handleNumericChange('dailySkillTreeLimit', e.target.value)} />
                     </div>
                 </div>

                 <h4 className="font-bold text-accent">Feature Toggles</h4>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-adv-skill-tree`}>Advanced Skill Tree</Label>
                        <Switch id={`${planId}-adv-skill-tree`} checked={config.featureAdvancedSkillTree || false} onCheckedChange={(c) => handleToggleChange('featureAdvancedSkillTree', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-whiteboard`}>Whiteboard Notes</Label>
                        <Switch id={`${planId}-whiteboard`} checked={config.featureWhiteboardNotes || false} onCheckedChange={(c) => handleToggleChange('featureWhiteboardNotes', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-pdf-preview`}>PDF Page Preview</Label>
                        <Switch id={`${planId}-pdf-preview`} checked={config.featurePdfPagePreview || false} onCheckedChange={(c) => handleToggleChange('featurePdfPagePreview', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-doc-search`}>Document Search</Label>
                        <Switch id={`${planId}-doc-search`} checked={config.featureDocSearch || false} onCheckedChange={(c) => handleToggleChange('featureDocSearch', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-ai-summaries`}>AI Summaries</Label>
                        <Switch id={`${planId}-ai-summaries`} checked={config.featureAiSummaries || false} onCheckedChange={(c) => handleToggleChange('featureAiSummaries', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-offline`}>Offline Access</Label>
                        <Switch id={`${planId}-offline`} checked={config.featureOfflineAccess || false} onCheckedChange={(c) => handleToggleChange('featureOfflineAccess', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-export`}>Export Features</Label>
                        <Switch id={`${planId}-export`} checked={config.featureExport || false} onCheckedChange={(c) => handleToggleChange('featureExport', c)} />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor={`${planId}-gaming-themes`}>Gaming UI Themes</Label>
                        <Switch id={`${planId}-gaming-themes`} checked={config.featureGamingThemes || false} onCheckedChange={(c) => handleToggleChange('featureGamingThemes', c)} />
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <Button variant="glow" onClick={handleSave}><Save className="mr-2"/> Save {planId.charAt(0).toUpperCase() + planId.slice(1)} Plan</Button>
                 </div>
            </CardContent>
        </Card>
    )
}

function AdminPageContent({ user }: { user: any }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Data fetching hooks are now inside the component that is only rendered for admins.
    const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
    const usersQuery = useMemoFirebase(() => query(usersCollectionRef, orderBy('creationTime', 'desc')), [usersCollectionRef]);
    const { data: users, isLoading: areUsersLoading } = useCollection(usersQuery);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    const freePlanConfigRef = useMemoFirebase(() => doc(firestore, 'plan_configs', 'free'), [firestore]);
    const { data: freePlanConfig } = useDoc(freePlanConfigRef);

    const premiumPlanConfigRef = useMemoFirebase(() => doc(firestore, 'plan_configs', 'premium'), [firestore]);
    const { data: premiumPlanConfig } = useDoc(premiumPlanConfigRef);

    const pendingPaymentsQuery = useMemoFirebase(() => {
        const paymentVerificationsRef = collection(firestore, 'paymentVerifications');
        return query(paymentVerificationsRef, where('status', '==', 'pending'), orderBy('submittedAt', 'asc'));
    }, [firestore]);
    const { data: pendingPayments, isLoading: arePaymentsLoading } = useCollection(pendingPaymentsQuery);

    const handleAdminToggle = async (targetUser: any) => {
        const userRef = doc(firestore, "users", targetUser.id);
        await updateDoc(userRef, { isAdmin: !targetUser.isAdmin });
        toast({ title: "Permissions Updated" });
    };
    
    const handleSuspendToggle = async (targetUser: any) => {
        const userRef = doc(firestore, "users", targetUser.id);
        await updateDoc(userRef, { isSuspended: !targetUser.isSuspended });
        toast({ title: "User Status Updated" });
    };

    const handleConfigToggle = async (key: string, value: boolean) => {
        if (!siteConfigRef) return;
        await updateDoc(siteConfigRef, { [key]: value });
    };

    const handlePlanConfigSave = async (planId: string, data: PlanConfig) => {
        const planRef = doc(firestore, 'plan_configs', planId);
        await setDoc(planRef, data, { merge: true });
    };

    const handleApprovePayment = async (verification: any) => {
        const userRef = doc(firestore, 'users', verification.userId);
        const verificationRef = doc(firestore, 'paymentVerifications', verification.id);

        try {
            await writeBatch(firestore)
                .update(userRef, { plan: 'Premium', paymentStatus: 'none' })
                .delete(verificationRef)
                .commit();
            
            toast({ title: "Payment Approved", description: `${verification.userName}'s plan has been upgraded to Premium.` });
        } catch (error) {
            console.error("Error approving payment:", error);
            toast({ variant: 'destructive', title: "Approval Failed", description: "Could not update user's plan." });
        }
    };
    
    const handleRejectPayment = async (verificationId: string) => {
        const verificationRef = doc(firestore, 'paymentVerifications', verificationId);
         try {
            await deleteDoc(verificationRef);
            toast({ title: "Payment Rejected", description: "The verification request has been deleted." });
        } catch (error) {
            console.error("Error rejecting payment:", error);
            toast({ variant: 'destructive', title: "Rejection Failed", description: "Could not delete the request." });
        }
    };

    const isLoading = areUsersLoading || isConfigLoading || arePaymentsLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader className="animate-spin text-accent h-16 w-16" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold font-headline text-glow">Liquid Cooled | Admin</h1>
            
             <Tabs defaultValue="payments" className="w-full">
                <ScrollArea className="w-full whitespace-nowrap">
                    <TabsList className="inline-flex w-auto">
                        <TabsTrigger value="payments"><Banknote className="w-4 h-4 mr-2"/> Payment Verification</TabsTrigger>
                        <TabsTrigger value="plans"><DollarSign className="w-4 h-4 mr-2"/> Plan Management</TabsTrigger>
                        <TabsTrigger value="users"><User className="w-4 h-4 mr-2"/> User Management</TabsTrigger>
                        <TabsTrigger value="site"><Wrench className="w-4 h-4 mr-2"/> Site Settings</TabsTrigger>
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                 <TabsContent value="payments" className="mt-6">
                    <Card className="glass-pane border-accent/50 shadow-[0_0_15px_hsl(var(--accent)/0.5)]">
                        <CardHeader>
                            <CardTitle className="font-headline text-accent">Payment Verification</CardTitle>
                             <CardDescription>Review and approve or reject manual payment submissions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-accent/20 hover:bg-accent/10">
                                            <TableHead>User</TableHead>
                                            <TableHead>UTR / Transaction ID</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPayments && pendingPayments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">No pending payments.</TableCell>
                                            </TableRow>
                                        )}
                                        {pendingPayments?.map(p => (
                                            <TableRow key={p.id} className="border-accent/20 hover:bg-accent/10">
                                                <TableCell>
                                                    <div className="font-medium">{p.userName}</div>
                                                    <div className="text-sm text-muted-foreground">{p.userEmail}</div>
                                                </TableCell>
                                                <TableCell className="font-mono">{p.utr}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">
                                                    {p.submittedAt ? formatDistanceToNow(p.submittedAt.toDate(), { addSuffix: true }) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><XCircle/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will delete the verification request for {p.userName}. The user will need to resubmit. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRejectPayment(p.id)} className="bg-destructive hover:bg-destructive/90">Reject</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-green-400 hover:text-green-400"><CheckCircle /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will upgrade {p.userName} to the Premium plan and delete this verification request.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleApprovePayment(p)}>Approve</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="plans" className="mt-6 space-y-6">
                   <PlanConfigForm planId="free" planData={freePlanConfig as PlanConfig} onSave={handlePlanConfigSave} />
                   <PlanConfigForm planId="premium" planData={premiumPlanConfig as PlanConfig} onSave={handlePlanConfigSave} />
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <Card className="glass-pane">
                        <CardHeader>
                            <CardTitle className="font-headline">User Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border/20 hover:bg-muted/50">
                                            <TableHead><User className="inline-block" /> User</TableHead>
                                            <TableHead>Subscription</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-center"><Shield className="inline-block" /> Admin</TableHead>
                                            <TableHead className="text-center">Suspended</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users?.map(u => (
                                            <TableRow key={u.id} className="border-border/20 hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarImage src={u.photoURL} alt={u.displayName} />
                                                            <AvatarFallback>{u.displayName?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium whitespace-nowrap">{u.displayName}</p>
                                                            <p className="text-xs text-muted-foreground break-all">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={u.plan === 'Premium' ? 'default' : 'secondary'} className={u.plan === 'Premium' ? 'bg-primary' : ''}>
                                                        {u.plan || 'Free'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
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
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="site" className="mt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                       <Card className="glass-pane md:col-span-3 lg:col-span-2">
                           <CardHeader>
                               <CardTitle className="font-headline text-accent flex items-center gap-2"><Wrench/>Site Status</CardTitle>
                               <CardDescription>Toggle features on or off. 'Off' puts the feature into maintenance mode for non-admins.</CardDescription>
                           </CardHeader>
                           <CardContent className="grid sm:grid-cols-2 gap-4">
                               <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-3">
                                   <Label htmlFor="siteWideMaintenance" className="font-semibold text-destructive">Site-wide Maintenance</Label>
                                   <Switch id="siteWideMaintenance" checked={siteConfig?.siteWideMaintenance || false} onCheckedChange={(c) => handleConfigToggle('siteWideMaintenance', c)} />
                               </div>
                                <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="stickyNotesWip" className="flex items-center gap-2"><StickyNote className="w-4 h-4" />Sticky Notes Active</Label>
                                   <Switch id="stickyNotesWip" checked={siteConfig?.stickyNotesWip !== false} onCheckedChange={(c) => handleConfigToggle('stickyNotesWip', c)} />
                               </div>
                                <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="generateWip" className="flex items-center gap-2"><Bot className="w-4 h-4" />Generate Page Active</Label>
                                   <Switch id="generateWip" checked={siteConfig?.generateWip !== false} onCheckedChange={(c) => handleConfigToggle('generateWip', c)} />
                               </div>
                                <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="notesWip" className="flex items-center gap-2"><Notebook className="w-4 h-4" />Notes Page Active</Label>
                                   <Switch id="notesWip" checked={siteConfig?.notesWip !== false} onCheckedChange={(c) => handleConfigToggle('notesWip', c)} />
                               </div>
                                <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="analyzeWip" className="flex items-center gap-2"><ScanLine className="w-4 h-4" />Analyze Page Active</Label>
                                   <Switch id="analyzeWip" checked={siteConfig?.analyzeWip !== false} onCheckedChange={(c) => handleConfigToggle('analyzeWip', c)} />
                               </div>
                                <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="accountWip" className="flex items-center gap-2"><User className="w-4 h-4" />Account Page Active</Label>
                                   <Switch id="accountWip" checked={siteConfig?.accountWip !== false} onCheckedChange={(c) => handleConfigToggle('accountWip', c)} />
                               </div>
                               <div className="flex items-center justify-between p-3">
                                   <Label htmlFor="skillTreeWip" className="flex items-center gap-2"><Network className="w-4 h-4" />Skill Tree Active</Label>
                                   <Switch id="skillTreeWip" checked={siteConfig?.skillTreeWip !== false} onCheckedChange={(c) => handleConfigToggle('skillTreeWip', c)} />
                               </div>
                           </CardContent>
                       </Card>
                        <Card className="glass-pane md:col-span-3 lg:col-span-1">
                            <CardHeader>
                               <CardTitle className="font-headline text-accent flex items-center gap-2"><Coffee/>Support</CardTitle>
                               <CardDescription>Manage support links and other resources.</CardDescription>
                           </CardHeader>
                           <CardContent className="space-y-4">
                              <Button variant="glow" className="w-full" asChild>
                                  <a href="https://buymeacoffee.com/liquidd" target="_blank" rel="noopener noreferrer">Buy Liquid a Coffee!</a>
                              </Button>
                           </CardContent>
                       </Card>
                   </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function LiquidAdminPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    useEffect(() => {
        // Redirect non-admins or if profile fails to load
        if (!isProfileLoading && (!userProfile || !userProfile.isAdmin)) {
            router.replace('/dashboard');
        }
    }, [isProfileLoading, userProfile, router]);
    
    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader className="animate-spin text-accent h-16 w-16" />
            </div>
        );
    }
    
    // Once loading is complete, we check for admin status.
    // If not an admin, show a "Not Authorized" message.
    if (!userProfile?.isAdmin) {
         return (
             <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Card className="glass-pane p-8 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive"/>
                    <h2 className="mt-4 text-2xl font-bold font-headline">Not Authorized</h2>
                    <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
                </Card>
            </div>
        );
    }

    // Only render the admin content if the user is confirmed to be an admin.
    return <AdminPageContent user={user} />;
}
