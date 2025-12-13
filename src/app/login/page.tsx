'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    // In a real app, this would trigger Firebase Google sign-in
    console.log("Signing in with Google...");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
        <div 
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'radial-gradient(circle at top left, hsl(var(--primary) / 0.2), transparent 30%), radial-gradient(circle at bottom right, hsl(var(--accent) / 0.2), transparent 30%)'
            }}
        />
        <Link href="/" className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
            <Logo />
        </Link>
        <Card className="mx-auto max-w-sm w-full z-10 glass-pane">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 60.3l-66.8 66.8c-20-17.7-50.4-29.8-86.1-29.8-69.6 0-126.1 56.5-126.1 126.1s56.5 126.1 126.1 126.1c76.2 0 112.5-52.4 116.8-79.3H248V261.8h239.2z"></path></svg>
                    Continue with Google
                </Button>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" variant="glow">
                    Sign In
                </Button>
                <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="underline text-accent hover:text-accent/80">
                        Sign up
                    </Link>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
