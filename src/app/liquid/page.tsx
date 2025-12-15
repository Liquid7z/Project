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


const usageData = [
  { name: 'Jan', total: Math.floor(Math.random() * 200) + 100 },
  { name: 'Feb', total: Math.floor(Math.random() * 200) + 150 },
  { name: 'Mar', total: Math.floor(Math.random() * 200) + 200 },
  { name: 'Apr', total: Math.floor(Math.random() * 200) + 250 },
  { name: 'May', total: Math.floor(Math.random() * 200) + 300 },
  { name: 'Jun', total: Math.floor(Math.random() * 200) + 350 },
];


export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = React.useState(true);


  React.useEffect(() => {
    if (!isUserLoading && user) {
      user.getIdTokenResult().then(idTokenResult => {
        const isAdminClaim = !!idTokenResult.claims.isAdmin;
        setIsAdmin(isAdminClaim);
        setIsCheckingAdmin(false);
        if (!isAdminClaim) {
          router.replace('/dashboard');
        }
      });
    } else if (!isUserLoading && !user) {
        // Not logged in, redirect
        router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
  };
  const handleDeselectUser = () => {
    setSelectedUser(null);
  };

  if (isCheckingAdmin || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedUser) {
    return (
      <UserProfileView user={selectedUser} onBack={handleDeselectUser} />
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
            <h1 className="text-3xl font-bold font-headline">Liquid Admin</h1>
        </div>
        <Tabs defaultValue="overview">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="mr-2" />
                Overview
              </TabsTrigger>
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
          <TabsContent value="overview" className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,254</div>
                  <p className="text-xs text-muted-foreground">
                    +20.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Premium Subscribers
                  </CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+235</div>
                   <p className="text-xs text-muted-foreground">
                    +180.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Notes Created</CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12,234</div>
                  <p className="text-xs text-muted-foreground">
                    +19% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+573</div>
                  <p className="text-xs text-muted-foreground">
                    +201 since last hour
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>New Users</CardTitle>
                    <CardDescription>New user registrations over the last 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={usageData}>
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                            New Users
                                        </span>
                                        <span className="font-bold text-foreground">
                                            {payload[0].value}
                                        </span>
                                        </div>
                                    </div>
                                    </div>
                                )
                                }

                                return null
                            }}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

          </TabsContent>
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  Manage your users and view their details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserTable onSelectUser={handleSelectUser} />
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

const UserTable = ({ onSelectUser }: { onSelectUser: (user: any) => void }) => {
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
            <TableRow key={user.id} className="cursor-pointer" onClick={() => onSelectUser(user)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="relative">
                     <CircleUser className="h-8 w-8 text-muted-foreground" />
                     {/* {user.status === 'online' && <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-background"></span>} */}
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
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
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

const UserProfileView = ({ user, onBack }: { user: any; onBack: () => void }) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handlePlanChange = async (newPlan: 'Free' | 'Premium') => {
      const userRef = doc(firestore, 'users', user.id);
      try {
        await updateDoc(userRef, { plan: newPlan });
        toast({
          title: "Plan updated",
          description: `${user.displayName}'s plan has been changed to ${newPlan}.`
        });
        // Note: The UI will update automatically due to the real-time listener on the user list.
      } catch (error) {
        console.error("Failed to update plan:", error);
        toast({
          variant: "destructive",
          title: "Update failed",
          description: "Could not update the user's plan."
        });
      }
    };
    
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <h1 className="font-semibold text-lg md:text-2xl">User Profile: {user.displayName}</h1>
                <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline">Suspend</Button>
                    <Select defaultValue={user.plan?.toLowerCase() || 'free'} onValueChange={(value) => handlePlanChange(value === 'premium' ? 'Premium' : 'Free')}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">User Information</CardTitle>
                        <CircleUser className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Last Login:</strong> {user.lastSignInTime ? formatDistanceToNow(new Date(user.lastSignInTime), { addSuffix: true }) : 'Never'}</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usage Statistics</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                     <CardContent>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>Subjects:</strong> {user.subjects || 0}</p>
                            <p><strong>Notes:</strong> {user.notes || 0}</p>
                            <p><strong>Documents:</strong> {user.documents || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <File className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">{user.storage || '0 MB'}</div>
                         <p className="text-xs text-muted-foreground">
                            out of {user.plan === 'Premium' ? '10 GB' : '1 GB'}
                        </p>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>User Content</CardTitle>
                    <CardDescription>Read-only overview of user's content.</CardDescription>
                </CardHeader>
                <CardContent>
                     <p className="text-sm text-muted-foreground">Content inspection is read-only to respect user privacy. No content can be edited or deleted from this view.</p>
                     <div className="mt-4 rounded-md border p-4 text-center">
                        <p className="font-semibold">Content Overview Coming Soon</p>
                        <p className="text-sm text-muted-foreground">A high-level view of this user's notes and documents will be available here.</p>
                     </div>
                </CardContent>
            </Card>
        </div>
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
            <Card className='mt-4 bg-secondary/30'>
                <CardContent className='p-4 text-center text-sm text-muted-foreground'>
                    <p>Putting a feature in maintenance mode will show a friendly message to users.</p>
                    <p>Like what we do? <a href="#" className='underline hover:text-accent'>Buy Liquid a coffee!</a></p>
                </CardContent>
            </Card>
            </CardContent>
        </Card>
    )
}
