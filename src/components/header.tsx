
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/landing');
    }
  };

  const renderAuthButtons = () => {
    if (isUserLoading) {
      return <Skeleton className="h-10 w-24" />;
    }

    if (user) {
      return (
        <>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button onClick={handleLogout}>Log Out</Button>
        </>
      );
    }

    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild variant="glow">
          <Link href="/signup">Get Started</Link>
        </Button>
      </>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/landing" aria-label="LiqAI Home">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {renderAuthButtons()}
        </div>
      </div>
    </header>
  );
}
