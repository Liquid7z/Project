'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Bot,
  ScanLine,
  User,
  LogOut,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', icon: Bot, label: 'Generate' },
  { href: '/dashboard/analyze', icon: ScanLine, label: 'Analyze Style' },
  { href: '/dashboard/account', icon: User, label: 'Account' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentPage = navItems.find(i => pathname.startsWith(i.href));

  return (
    <SidebarProvider>
      <div className="relative min-h-screen">
        {/* Desktop Sidebar */}
        <Sidebar
          variant="inset"
          collapsible="icon"
          className="hidden md:block border-r-0 glass-pane !bg-card/30"
        >
          <SidebarHeader className="p-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
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
                              <AvatarImage src="https://picsum.photos/seed/user-avatar/40/40" alt="User" data-ai-hint="person face" />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <div className="grow overflow-hidden text-left">
                                <p className="font-medium truncate text-sm">User</p>
                                <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                            </div>
                        </SidebarMenuButton>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="glass-pane w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Mobile Header and Sidebar */}
        <div className="md:hidden">
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/50 px-4 sm:px-6 backdrop-blur-lg">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="outline" className="shrink-0">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col glass-pane !border-l-0">
                        <nav className="grid gap-2 text-lg font-medium">
                            <SheetClose asChild>
                                <Link href="/dashboard" className="mb-4">
                                    <Logo />
                                </Link>
                            </SheetClose>
                            {navItems.map(item => (
                                <SheetClose asChild key={item.href}>
                                    <Link href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${pathname.startsWith(item.href) ? 'bg-accent/50 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                </SheetClose>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
                 <div className="flex-1">
                    <h1 className="font-semibold text-lg">{currentPage?.label}</h1>
                </div>
            </header>
        </div>
        
        <SidebarInset className="md:border-none md:shadow-none md:rounded-none md:m-0 glass-pane">
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
