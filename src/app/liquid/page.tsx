'use client';
import {
  Activity,
  ArrowUpRight,
  BookUser,
  CircleUser,
  CreditCard,
  DollarSign,
  Menu,
  Package2,
  Search,
  Users,
  ShieldCheck,
  Settings,
  BarChart3,
  ListFilter,
  MoreHorizontal,
  File,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  Wrench,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { Separator } from '@/components/ui/separator';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';


export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const isAdmin = userProfile?.isAdmin;

  // This effect handles redirection once all loading is complete.
  React.useEffect(() => {
    // Wait until both user auth and profile loading are finished.
    if (isUserLoading || isProfileLoading) {
      return; // Still loading, do nothing yet.
    }
    
    // If loading is done and there's no user, or the user is not an admin, redirect.
    if (!user || !isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, isUserLoading, isProfileLoading, router]);

  // While loading, show a full-screen loader to prevent showing content prematurely.
  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished and the user is an admin, render the dashboard.
  // The redirection logic above will handle non-admin cases.
  if (isAdmin) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="flex items-center">
              <h1 className="text-3xl font-bold font-headline">Liquid Admin</h1>
          </div>
          <Tabs defaultValue="users">
            <div className="flex items-center">
              <TabsList>
                <TabsTrigger value="users">
                  <Users className="mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="features">
                  <Zap className="mr-2" />
                  Premium Features
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Manage your users and view their details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserTable />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="features" className="space-y-4">
              <FeatureManagementPanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  // Fallback, typically won't be seen due to the loader and redirects.
  return null;
}

const UserTable = () => {
  const firestore = useFirestore();
  const usersRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading, error } = useCollection(usersRef);

  if (isLoading) {
    return (
       <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className='flex-1 space-y-2'>
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="mt-4 font-semibold">Failed to load users</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-4">
        <Input placeholder="Filter users..." className="max-w-sm" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 gap-1">
              <ListFilter className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Filter
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked>
              Active
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Premium</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>Free</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="hidden md:table-cell">Last Login</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users && users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="relative">
                     <CircleUser className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.plan === 'Premium' ? 'default' : 'secondary'}>
                  {user.plan || 'Free'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {user.lastSignInTime ? formatDistanceToNow(new Date(user.lastSignInTime), { addSuffix: true }) : 'Never'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-haspopup="true"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Upgrade to Premium</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Suspend User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                Showing <strong>1-{users?.length || 0}</strong> of <strong>{users?.length || 0}</strong> users
            </div>
            <div className="space-x-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="outline" size="sm">Next</Button>
            </div>
        </div>
    </>
  );
};

const initialFeatures = [
    { id: 'ai-coach', name: 'AI Study Coach', description: 'Personalized study suggestions and topic explanations.' },
    { id: 'ai-summaries', name: 'AI Summaries', description: 'Automatic summarization of notes and documents.' },
    { id: 'handwriting-generation', name: 'Handwriting Generation', description: 'Generate text in a handwritten style.' },
    { id: 'handwriting-analysis', name: 'Handwriting Analysis', description: 'Analyze handwriting samples to create AI models.' },
    { id: 'ocr', name: 'OCR & Text Extraction', description: 'Extract text from uploaded images and PDFs.' },
    { id: 'version-history', name: 'Note Version History', description: 'Track changes and restore previous versions of notes.' },
    { id: 'skill-tree', name: 'Skill-Tree Visualization', description: 'Interactive knowledge map of your subjects.' },
    { id: 'advanced-exports', name: 'Advanced Exports (PDF, Markdown)', description: 'Export notes and subjects in various formats.' },
    { id: 'storage-limit', name: 'Higher Storage Limit (10GB)', description: 'Increased storage for premium users.' },
];

const FeatureManagementPanel = () => {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const featuresConfigRef = useMemoFirebase(() => doc(firestore, 'appConfig', 'features'), [firestore]);
    const { data: featuresConfig, isLoading, error } = useDoc(featuresConfigRef);

    const handleToggle = async (featureId: string, type: 'enabled' | 'maintenance', value: boolean) => {
        if (!featuresConfigRef) return;
        try {
            await updateDoc(featuresConfigRef, {
                [`${featureId}.${type}`]: value
            });
            toast({
                title: 'Feature Updated',
                description: `Successfully updated ${featureId}.`
            })
        } catch (e) {
            console.error('Failed to update feature toggle', e);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: `Could not update ${featureId}.`
            })
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-3 w-64" />
                            </div>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-6 w-20" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
            <CardTitle>Feature Management</CardTitle>
            <CardDescription>
                Control premium features and toggle maintenance mode.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {initialFeatures.map(feature => {
                const config = featuresConfig ? (featuresConfig[feature.id] || {}) : {};
                const isEnabled = config.enabled ?? false;
                const isMaintenance = config.maintenance ?? false;

                return (
                    <div key={feature.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                        <div>
                            <h3 className="font-medium">{feature.name}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                                <div className='flex items-center gap-2'>
                                <Label htmlFor={`maintenance-${feature.id}`} className="text-sm flex items-center gap-1"><Wrench className="w-3 h-3" /> Maint.</Label>
                                <Switch 
                                    id={`maintenance-${feature.id}`} 
                                    checked={isMaintenance}
                                    onCheckedChange={(checked) => handleToggle(feature.id, 'maintenance', checked)}
                                />
                                </div>
                                <Separator orientation='vertical' className='h-6' />
                                <div className='flex items-center gap-2'>
                                <Label htmlFor={`premium-${feature.id}`} className="text-sm flex items-center gap-1"><Zap className="w-3 h-3" /> Premium</Label>
                                <Switch 
                                    id={`premium-${feature.id}`} 
                                    checked={isEnabled} 
                                    onCheckedChange={(checked) => handleToggle(feature.id, 'enabled', checked)}
                                    />
                                </div>
                        </div>
                    </div>
                )
            })}
            </CardContent>
        </Card>
    )
}
