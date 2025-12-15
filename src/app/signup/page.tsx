'use client';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


export default function SignupPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: ""
        },
    });

    const createUserProfile = (user: any, displayName?: string) => {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userData = {
            id: user.uid,
            email: user.email,
            displayName: displayName || user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL,
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString(),
        };
        setDocumentNonBlocking(userDocRef, userData, { merge: true });
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            await updateProfile(userCredential.user, { displayName: values.name });
            createUserProfile(userCredential.user, values.name);
            router.push('/dashboard');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Sign-up failed",
                description: error.message,
            });
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.1), transparent 30%), radial-gradient(circle at bottom left, hsl(var(--accent) / 0.1), transparent 30%)'
                }}
            />
            <Link href="/" className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                <Logo />
            </Link>
            <Card className="mx-auto max-w-sm w-full z-10">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
                    <CardDescription>Enter your information to get started</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="name">Display Name</Label>
                                        <FormControl>
                                            <Input id="name" placeholder="Your Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="email">Email</Label>
                                        <FormControl>
                                            <Input id="email" placeholder="m@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="password">Password</Label>
                                        <FormControl>
                                            <Input id="password" type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="confirm-password">Confirm Password</Label>
                                        <FormControl>
                                            <Input id="confirm-password" type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <Button type="submit" className="w-full mt-4" variant="glow" disabled={form.formState.isSubmitting}>
                                Create Account
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="underline text-accent hover:text-accent/80">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
