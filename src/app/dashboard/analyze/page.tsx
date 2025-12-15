
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUploader } from '@/components/file-uploader';
import { analyzeStyleAction } from '@/actions/generation';
import { LoadingAnimation } from '@/components/loading-animation';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Loader } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { WipPage } from '@/components/wip-page';

export default function AnalyzePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    
    const handwritingSampleImage = PlaceHolderImages.find(p => p.id === 'handwriting-sample');

    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    const isPageLoading = isUserLoading || isProfileLoading || isConfigLoading;

    const handleFileUpload = (file: File) => {
        setUploadedFile(file);
        setAnalysisResult(null);
    };

    const handleAnalyze = async () => {
        if (!uploadedFile) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(uploadedFile);
        reader.onload = async () => {
            try {
                const handwritingSampleDataUri = reader.result as string;
                const result = await analyzeStyleAction({ handwritingSampleDataUri });
                setAnalysisResult(result.styleModelId);
            } catch (error) {
                console.error("Failed to analyze handwriting:", error);
                // In a real app, show a toast notification
            } finally {
                setIsLoading(false);
            }
        };
    };

    if (isPageLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    const isAdmin = userProfile?.isAdmin === true;
    const isWip = siteConfig?.analyzeWip === false && !isAdmin;

    if (isWip) {
        return <WipPage />;
    }

    return (
        <div className="grid gap-6">
            {isLoading && <LoadingAnimation text="Analyzing your handwriting..." />}
            <Card className="glass-pane relative overflow-hidden">
                <CardHeader>
                    <CardTitle className="font-headline">Analyze Your Handwriting Style</CardTitle>
                    <CardDescription>Upload an image of your handwriting to create a personalized AI model.</CardDescription>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-accent">Instructions</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
                            <li>Write a few paragraphs on a clean, unlined sheet of paper.</li>
                            <li>Use a dark pen for good contrast.</li>
                            <li>Take a clear, well-lit photo or scan the page.</li>
                            <li>Upload the image as a PNG, JPG, or PDF.</li>
                        </ul>
                        <div className="relative aspect-[4/3] w-full rounded-md overflow-hidden border-2 border-dashed">
                             {handwritingSampleImage && <Image
                                src={handwritingSampleImage.imageUrl}
                                alt={handwritingSampleImage.description}
                                fill
                                className="object-cover"
                                data-ai-hint={handwritingSampleImage.imageHint}
                            />}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                                <p className="text-white font-medium text-sm">Example of a good handwriting sample</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <FileUploader onFileUpload={handleFileUpload} />
                        <Button variant="glow" onClick={handleAnalyze} disabled={!uploadedFile || isLoading} className="w-full">
                            Analyze Style
                        </Button>
                        {analysisResult && (
                             <Alert className="border-accent bg-accent/10 text-accent-foreground">
                                <CheckCircle className="h-4 w-4 !text-accent" />
                                <AlertTitle className="text-accent">Analysis Complete!</AlertTitle>
                                <AlertDescription className="font-code text-xs">
                                    Your new style model ID is: <br /> {analysisResult}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
