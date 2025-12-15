
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerification, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { Check, User, CreditCard, Shield, Loader, MailCheck, AlertTriangle, Phone, Save, Upload, Edit, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WipPage } from '@/components/wip-page';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Label } from '@/components/ui/label';


const freePlanFeatures = [
    '3 handwriting generations per month',
    '1 handwriting style analysis',
    'Community support',
];

const premiumPlanFeatures = [
    'Unlimited handwriting generations',
    'Unlimited style analyses',
    'Save and export in high resolution',
    'Access to new handwriting models',
    'Priority support',
];

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
});


export default function AccountPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isEditing, setIsEditing] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);


    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);
    
    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: '',
        },
    });

    const inbuiltAvatars = PlaceHolderImages.filter(p => p.id.startsWith('avatar-'));
    
    useEffect(() => {
        if (user) {
            profileForm.setValue('displayName', user.displayName || '');
            setAvatarPreview(user.photoURL);
        }
    }, [user, profileForm]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 200 * 1024) { // 200KB
                toast({
                    variant: "destructive",
                    title: "Image too large",
                    description: "Please upload an image smaller than 200KB.",
                });
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };
    
    const handleInbuiltAvatarSelect = (imageUrl: string) => {
        setAvatarFile(null); // Clear any uploaded file
        setAvatarPreview(imageUrl);
    }

    const handleEditToggle = () => {
        if (isEditing) {
            // If canceling edit, reset form to original user data
            if(user) {
                profileForm.setValue('displayName', user.displayName || '');
                setAvatarPreview(user.photoURL);
            }
            setAvatarFile(null);
        }
        setIsEditing(!isEditing);
    }
    
     const handleProfileSave = async (values: z.infer<typeof profileFormSchema>) => {
        if (!user || !auth.currentUser) return;
        setIsSavingProfile(true);

        try {
            let newPhotoURL = avatarPreview || user.photoURL;

            // Upload new avatar if a custom file was selected
            if (avatarFile) {
                const storage = getStorage();
                const avatarRef = ref(storage, `users/${user.uid}/avatar/${avatarFile.name}`);
                const snapshot = await uploadBytes(avatarRef, avatarFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // Update Firebase Auth profile
            await updateProfile(auth.currentUser, {
                displayName: values.displayName,
                photoURL: newPhotoURL,
            });

            // Update Firestore user document
            if (userProfileRef) {
                await updateDoc(userProfileRef, {
                    displayName: values.displayName,
                    photoURL: newPhotoURL,
                });
            }

            toast({
                title: "Profile Updated",
                description: "Your account information has been saved.",
            });
            setIsEditing(false); // Exit editing mode on successful save

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message,
            });
        } finally {
            setIsSavingProfile(false);
            setAvatarFile(null);
        }
    };


    const isLoading = isUserLoading || isProfileLoading || isConfigLoading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    if (!user) {
        // This case should be handled by the layout, but as a fallback
        router.push('/login');
        return null;
    }

    const isAdmin = userProfile?.isAdmin === true;
    const isWip = siteConfig?.accountWip === false && !isAdmin;

    if (isWip) {
        return <WipPage />;
    }

    // This would come from user data in a real app
    const currentUserPlan = userProfile?.plan || 'Free';

    const handleVerifyEmail = async () => {
        if (!user) return;
        try {
            await sendEmailVerification(user);
            toast({
                title: "Verification Email Sent",
                description: "A verification link has been sent to your email address. Please check your inbox.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error Sending Verification",
                description: error.message,
            });
        }
    };

    const handlePasswordReset = async () => {
        if (!user || !user.email) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: "Password Reset Email Sent",
                description: "A link to reset your password has been sent to your email.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        }
    };

    return (
        <div className="grid gap-6">
             <Card className="glass-pane">
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSave)}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                               <CardTitle className="font-headline">Your Profile</CardTitle>
                               <CardDescription>Manage your public profile and personal information.</CardDescription>
                            </div>
                             {!isEditing && (
                                <Button variant="outline" onClick={handleEditToggle}><Edit className="mr-2"/>Edit Profile</Button>
                             )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className={cn("relative", !isEditing && "pointer-events-none")}>
                                    <Avatar className="h-24 w-24 border-2 border-accent">
                                        <AvatarImage src={avatarPreview || `https://avatar.vercel.sh/${user?.email}.png`} alt={user.displayName || 'user'}/>
                                        <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                                    </Avatar>
                                     {isEditing && <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-secondary text-secondary-foreground rounded-full p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                                        <Upload className="h-4 w-4" />
                                        <input id="avatar-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                                    </label>}
                                </div>
                                 <FormField
                                    control={profileForm.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow w-full sm:w-auto">
                                            <FormLabel>Display Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Your Name" {...field} readOnly={!isEditing} className={cn(!isEditing && "border-none bg-transparent")} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {isEditing && <div className="space-y-2">
                                <Label>Or choose an avatar</Label>
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {inbuiltAvatars.map(avatar => (
                                        <button key={avatar.id} type="button" onClick={() => handleInbuiltAvatarSelect(avatar.imageUrl)} className={cn("relative aspect-square rounded-full overflow-hidden border-2 transition-all", avatarPreview === avatar.imageUrl ? "border-accent" : "border-transparent hover:border-accent/50")}>
                                            <Image src={avatar.imageUrl} alt={avatar.description} fill className="object-cover" data-ai-hint={avatar.imageHint} />
                                            {avatarPreview === avatar.imageUrl && (
                                                <div className="absolute inset-0 bg-accent/50 flex items-center justify-center">
                                                    <CheckCircle className="w-6 h-6 text-accent-foreground" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>}
                        </CardContent>
                        {isEditing && <CardFooter className="gap-2">
                            <Button variant="ghost" type="button" onClick={handleEditToggle}>
                                <X className="mr-2"/>
                                Cancel
                            </Button>
                            <Button variant="glow" type="submit" disabled={isSavingProfile}>
                                {isSavingProfile ? <Loader className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                                Save Changes
                            </Button>
                        </CardFooter>}
                    </form>
                </Form>
            </Card>

            <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="font-headline">Manage Your Subscription</CardTitle>
                    <CardDescription>You are currently on the {currentUserPlan} plan.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-background/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Free Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {freePlanFeatures.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" disabled={currentUserPlan === 'Free'}>
                                Current Plan
                            </Button>
                        </CardFooter>
                    </Card>
                     <Card className="border-accent bg-accent/10">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-glow">Premium Plan</CardTitle>
                            <p className="text-3xl font-bold font-headline mt-2">Rs 69<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-foreground">
                                {premiumPlanFeatures.map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-accent" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="glow" className="w-full">
                                Upgrade to Premium
                            </Button>
                        </CardFooter>
                    </Card>
                </CardContent>
            </Card>

             <Card className="glass-pane">
                <CardHeader>
                    <CardTitle className="font-headline">Security Settings</CardTitle>
                </CardHeader>
                 <CardContent className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <User className="w-5 h-5 text-accent mt-1"/>
                        <div>
                            <p className="font-semibold">Email</p>
                            <p className="text-muted-foreground break-all">{user.email}</p>
                            {user.emailVerified ? (
                                <div className="flex items-center gap-1 text-xs text-green-400 mt-2">
                                    <MailCheck className="w-3 h-3" />
                                    <span>Verified</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 text-xs text-amber-400">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Not Verified</span>
                                    </div>
                                    <Button variant="secondary" size="sm" className="h-auto px-2 py-0.5 text-xs" onClick={handleVerifyEmail}>Verify Now</Button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <Phone className="w-5 h-5 text-accent mt-1"/>
                        <div>
                            <p className="font-semibold">Phone Number</p>
                            {user.phoneNumber ? (
                                <p className="text-muted-foreground">{user.phoneNumber}</p>
                            ) : (
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-xs text-muted-foreground">Not set</p>
                                    <Button variant="secondary" size="sm" className="h-auto px-2 py-0.5 text-xs">Add Phone</Button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="flex items-start gap-3 p-4 rounded-md bg-background/50">
                        <Shield className="w-5 h-5 text-accent mt-1"/>
                        <div>
                            <p className="font-semibold">Password</p>
                            <Button variant="secondary" size="sm" className="h-auto px-2 py-1 mt-1" onClick={handlePasswordReset}>Change Password</Button>
                        </div>
                    </div>
                 </CardContent>
             </Card>
        </div>
    );

    

    

    
