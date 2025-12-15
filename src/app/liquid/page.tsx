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

const mockUsers = [
  {
    name: 'Liam Johnson',
    email: 'liam@example.com',
    plan: 'Premium',
    lastLogin: '2 hours ago',
    status: 'online',
    subjects: 5,
    notes: 32,
    documents: 12,
    storage: '1.2 GB',
  },
  {
    name: 'Olivia Smith',
    email: 'olivia@example.com',
    plan: 'Free',
    lastLogin: '1 day ago',
    status: 'offline',
    subjects: 2,
    notes: 10,
    documents: 3,
    storage: '150 MB',
  },
  {
    name: 'Noah Williams',
    email: 'noah@example.com',
    plan: 'Premium',
    lastLogin: '5 minutes ago',
    status: 'online',
    subjects: 10,
    notes: 150,
    documents: 45,
    storage: '4.8 GB',
  },
  {
    name: 'Emma Brown',
    email: 'emma@example.com',
    plan: 'Free',
    lastLogin: '3 days ago',
    status: 'offline',
    subjects: 1,
    notes: 5,
    documents: 1,
    storage: '50 MB',
  },
  {
    name: 'James Jones',
    email: 'james@example.com',
    plan: 'Premium',
    lastLogin: '1 hour ago',
    status: 'online',
    subjects: 8,
    notes: 78,
    documents: 22,
    storage: '2.5 GB',
  },
];

const mockPremiumFeatures = [
    { id: 'ai-coach', name: 'AI Study Coach', enabled: true, description: 'Personalized study suggestions and topic explanations.', maintenance: false },
    { id: 'ai-summaries', name: 'AI Summaries', enabled: true, description: 'Automatic summarization of notes and documents.', maintenance: false },
    { id: 'handwriting-generation', name: 'Handwriting Generation', enabled: true, description: 'Generate text in a handwritten style.', maintenance: true },
    { id: 'handwriting-analysis', name: 'Handwriting Analysis', enabled: true, description: 'Analyze handwriting samples to create AI models.', maintenance: true },
    { id: 'ocr', name: 'OCR & Text Extraction', enabled: false, description: 'Extract text from uploaded images and PDFs.', maintenance: false },
    { id: 'version-history', name: 'Note Version History', enabled: true, description: 'Track changes and restore previous versions of notes.', maintenance: false },
    { id: 'skill-tree', name: 'Skill-Tree Visualization', enabled: true, description: 'Interactive knowledge map of your subjects.', maintenance: false },
    { id: 'advanced-exports', name: 'Advanced Exports (PDF, Markdown)', enabled: false, description: 'Export notes and subjects in various formats.', maintenance: false },
    { id: 'storage-limit', name: 'Higher Storage Limit (10GB)', enabled: true, description: 'Increased storage for premium users.', maintenance: false },
];

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

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
  };
  const handleDeselectUser = () => {
    setSelectedUser(null);
  };

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
             <Card>
              <CardHeader>
                <CardTitle>Feature Management</CardTitle>
                <CardDescription>
                  Control premium features and toggle maintenance mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockPremiumFeatures.map(feature => (
                    <div key={feature.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4">
                        <div>
                            <h3 className="font-medium">{feature.name}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                             <div className='flex items-center gap-2'>
                                <Label htmlFor={`maintenance-${feature.id}`} className="text-sm flex items-center gap-1"><Wrench className="w-3 h-3" /> Maint.</Label>
                                <Switch id={`maintenance-${feature.id}`} defaultChecked={feature.maintenance} />
                             </div>
                             <Separator orientation='vertical' className='h-6' />
                             <div className='flex items-center gap-2'>
                                <Label htmlFor={`premium-${feature.id}`} className="text-sm flex items-center gap-1"><Zap className="w-3 h-3" /> Premium</Label>
                                <Switch id={`premium-${feature.id}`} defaultChecked={feature.enabled} />
                             </div>
                        </div>
                    </div>
                ))}
                <Card className='mt-4 bg-secondary/30'>
                    <CardContent className='p-4 text-center text-sm text-muted-foreground'>
                        <p>Putting a feature in maintenance mode will show a friendly message to users.</p>
                        <p>Like what we do? <a href="#" className='underline hover:text-accent'>Buy Liquid a coffee!</a></p>
                    </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const UserTable = ({ onSelectUser }: { onSelectUser: (user: any) => void }) => {
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
          {mockUsers.map((user) => (
            <TableRow key={user.email} className="cursor-pointer" onClick={() => onSelectUser(user)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="relative">
                     <CircleUser className="h-8 w-8 text-muted-foreground" />
                     {user.status === 'online' && <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-background"></span>}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={user.plan === 'Premium' ? 'default' : 'secondary'}>
                  {user.plan}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {user.lastLogin}
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
                Showing <strong>1-5</strong> of <strong>{mockUsers.length}</strong> users
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
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={onBack}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <h1 className="font-semibold text-lg md:text-2xl">User Profile: {user.name}</h1>
                <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline">Suspend</Button>
                    <Select defaultValue={user.plan.toLowerCase()}>
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
                            <p><strong>Last Login:</strong> {user.lastLogin}</p>
                            <p><strong>Status:</strong> <Badge variant={user.status === 'online' ? 'default' : 'secondary'} className={user.status === 'online' ? 'bg-green-500/20 text-green-500 border-green-500/50' : ''}>{user.status}</Badge></p>
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
                            <p><strong>Subjects:</strong> {user.subjects}</p>
                            <p><strong>Notes:</strong> {user.notes}</p>
                            <p><strong>Documents:</strong> {user.documents}</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <File className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">{user.storage}</div>
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

    