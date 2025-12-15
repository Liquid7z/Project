

'use client';

import { useEffect, ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  ScanLine,
  User,
  LogOut,
  Menu,
  Loader,
  Notebook,
  Sun,
  LayoutDashboard,
  Bot,
  Shield,
  Droplets,
  StickyNote,
  Bell
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useUser, useAuth, useDoc, useMemoFirebase, useFirestore, useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/components/theme-provider';
import { doc, collection, query, orderBy, limit, updateDoc, writeBatch } from 'firebase/firestore';
import { WipPage } from '@/components/wip-page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCollection } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


const navItems = [
  { href: '/dashboard', icon: StickyNote, label: 'Sticky Notes', configFlag: 'stickyNotesWip' },
  { href: '/dashboard/generate', icon: Bot, label: 'Generate', configFlag: 'generateWip' },
  { href: '/dashboard/notes', icon: Notebook, label: 'Notes', configFlag: 'notesWip' },
  { href: '/dashboard/analyze', icon: ScanLine, label: 'Analyze Style', configFlag: 'analyzeWip' },
  { href: '/dashboard/account', icon: User, label: 'Account', configFlag: 'accountWip' },
];

const adminNavItems = [
    { href: '/liquid', icon: Droplets, label: 'Liquid' },
];

function GlowModeToggle({ id }: { id: string }) {
    const { isGlowMode, setIsGlowMode } = useTheme();
    return (
        <Switch 
            id={id} 
            checked={isGlowMode}
            onCheckedChange={setIsGlowMode}
        />
    )
}

function NotificationsPanel() {
    const { user, firestore } = useFirebase();
    const notificationsRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'notifications');
    }, [user, firestore]);
    const notificationsQuery = useMemoFirebase(() => {
        if (!notificationsRef) return null;
        return query(notificationsRef, orderBy('createdAt', 'desc'), limit(20));
    }, [notificationsRef]);
    
    const { data: notifications, isLoading } = useCollection(notificationsQuery);
    
    const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && unreadCount > 0 && notifications) {
            markAllAsRead();
        }
    };

    const markAllAsRead = async () => {
        if (!user || !firestore || !notifications) return;
        
        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        const batch = writeBatch(firestore);
        unreadNotifications.forEach(notification => {
            const notifRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
            batch.update(notifRef, { isRead: true });
        });
        await batch.commit();
    };

    const markAsRead = async (notificationId: string) => {
        if (!user || !firestore) return;
        const notifRef = doc(firestore, 'users', user.uid, 'notifications', notificationId);
        await updateDoc(notifRef, { isRead: true });
    };

    return (
        <Popover onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 glass-pane p-0">
                 <div className="p-4">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <p className="text-sm text-muted-foreground">Your recent updates.</p>
                </div>
                <ScrollArea className="h-[300px]">
                    {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>}
                    {!isLoading && notifications?.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</div>}
                    <div className="flex flex-col">
                        {notifications?.map(notif => (
                            <Link key={notif.id} href={notif.href || '#'} passHref>
                                <div 
                                    className={cn("p-4 border-b border-border/50 hover:bg-accent/10 cursor-pointer", !notif.isRead && "bg-primary/10")}
                                    onClick={() => markAsRead(notif.id)}
                                >
                                    <p className="text-sm font-medium">{notif.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

function DashboardNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading, userError } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
  const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);
  
  const isAdmin = userProfile?.isAdmin === true;

  useEffect(() => {
    if (!isUserLoading && (userError || !user)) {
      router.replace('/login');
    }
  }, [isUserLoading, user, userError, router]);

  const isLoading = isUserLoading || isProfileLoading || isConfigLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  // Site-wide maintenance check
  if (siteConfig?.siteWideMaintenance && !isAdmin) {
    return <WipPage />;
  }
  
  const currentNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsible="icon"
          className="hidden md:block border-r-0 !bg-card/30"
        >
          <SidebarHeader className="p-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>
                <Sun />
                <span>Display</span>
              </SidebarGroupLabel>
              <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center justify-between w-full">
                  <Label htmlFor="glow-mode-desktop">Glow mode</Label>
                  <GlowModeToggle id="glow-mode-desktop" />
                </div>
              </div>
            </SidebarGroup>
            <SidebarMenu>
              {currentNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true)}
                      tooltip={{ children: item.label }}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="group/user-menu w-full cursor-pointer">
                        <SidebarMenuButton className="w-full group-data-[collapsible=icon]:w-auto">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.photoURL ?? `https://avatar.vercel.sh/${user?.email}.png`} alt={user?.displayName ?? 'User'} />
                              <AvatarFallback>{user?.displayName?.[0] ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="grow overflow-hidden text-left">
                                <p className="font-medium truncate text-sm">{user?.displayName ?? 'User'}</p>
                                <p className="text-xs text-muted-foreground">{userProfile?.plan || 'Free'} Plan</p>
                            </div>
                        </SidebarMenuButton>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="glass-pane w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/account">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { if(auth) await signOut(auth); router.push('/') }}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1">
          {/* Mobile Header and Sidebar */}
          <header className="sticky top-0 z-40 flex md:hidden h-14 items-center gap-4 border-b bg-background/50 px-4 sm:px-6 backdrop-blur-lg">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button size="icon" variant="outline" className="shrink-0">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Toggle navigation menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex flex-col glass-pane !border-l-0">
                      <SheetHeader>
                          <SheetTitle>
                            <Link href="/dashboard">
                                <Logo />
                            </Link>
                          </SheetTitle>
                      </SheetHeader>
                      <nav className="grid gap-2 text-lg font-medium mt-4">
                          {currentNavItems.map(item => (
                              <SheetClose key={item.href} asChild>
                                  <Link href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${pathname.startsWith(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                      <item.icon className="h-4 w-4" />
                                      {item.label}
                                  </Link>
                              </SheetClose>
                          ))}
                      </nav>
                       <div className="mt-auto">
                          <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                              <div className="flex items-center justify-between w-full">
                                 <Label htmlFor="glow-mode-mobile">Glow mode</Label>
                                 <GlowModeToggle id="glow-mode-mobile" />
                              </div>
                          </div>
                          <Button variant="ghost" onClick={async () => { if(auth) await signOut(auth); router.push('/')}} className="w-full justify-start">
                              <LogOut className="mr-2 h-4 w-4" />
                              Log out
                          </Button>
                      </div>
                  </SheetContent>
              </Sheet>
              
               <div className="flex items-center gap-2">
                    <NotificationsPanel />
                </div>
              
              <div className="flex-1" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                      <AvatarImage src={user?.photoURL ?? `https://avatar.vercel.sh/${user?.email}.png`} alt={user?.displayName ?? 'User'} />
                      <AvatarFallback>{user?.displayName?.[0] ?? 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-pane">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/account">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { if(auth) await signOut(auth); router.push('/')}}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </header>
          
           <div className="hidden md:flex justify-end p-2 absolute top-0 right-0 z-10">
              <NotificationsPanel />
           </div>

          <main className="flex-1 p-4 md:p-6 relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardNav>{children}</DashboardNav>
  )
}

    

    
