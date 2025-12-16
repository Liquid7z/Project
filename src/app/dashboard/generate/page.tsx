
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/file-uploader';
import { generateAssignmentAction, extractTextAction } from '@/actions/generation';
import { LoadingAnimation } from '@/components/loading-animation';
import Image from 'next/image';
import { Download, FileText, Type, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { WipPage } from '@/components/wip-page';


type GeneratedPage = {
    pageNumber: number;
    pageDataUri: string;
};

export default function GeneratePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Processing...');
    const [textContent, setTextContent] = useState('');
    const [generatedPage, setGeneratedPage] = useState<GeneratedPage | null>(null);
    const { toast } = useToast();

    const userProfileRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const siteConfigRef = useMemoFirebase(() => doc(firestore, 'site_config', 'maintenance'), [firestore]);
    const { data: siteConfig, isLoading: isConfigLoading } = useDoc(siteConfigRef);

    const isPageLoading = isUserLoading || isProfileLoading || isConfigLoading;

    const handleFileUpload = async (file: File) => {
        setIsLoading(true);
        setLoadingText('Extracting text...');
        setGeneratedPage(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const documentDataUri = reader.result as string;
                const result = await extractTextAction({ documentDataUri });
                setTextContent(result.extractedText);
                
            } catch (error) {
                console.error("Failed to extract text:", error);
                toast({
                    variant: "destructive",
                    title: "Text Extraction Failed",
                    description: "Could not extract text from the uploaded document."
                })
            } finally {
                setIsLoading(false);
            }
        };
    };
    
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextContent(e.target.value);
        setGeneratedPage(null);
    }

    const handleGenerateClick = async () => {
        if (!textContent) {
            toast({
                variant: 'destructive',
                title: 'Input content is empty',
                description: 'Please type, paste, or upload content before generating.',
            });
            return;
        };

        setIsLoading(true);
        setLoadingText('Generating your study note...');

        try {
            // Using a default or placeholder style model ID
            const styleModelId = 'placeholder-style-model-id';

            const generationResult = await generateAssignmentAction({
                content: textContent,
                handwritingStyleModelId: styleModelId,
            });

            if (generationResult.assignmentPages && generationResult.assignmentPages.length > 0) {
                setGeneratedPage(generationResult.assignmentPages[0]);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Generation Failed",
                    description: "The AI failed to generate an output. Please try again."
                });
                setGeneratedPage(null);
            }

        } catch (error) {
            console.error("Failed to generate assignment:", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "An error occurred during the handwriting generation process."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderOutputContent = () => {
        if (generatedPage) {
            return (
                <div className="w-full max-w-2xl p-1">
                    <div className="w-full aspect-[3/4] relative group">
                        <Image
                            src={generatedPage.pageDataUri}
                            alt={`Generated page ${generatedPage.pageNumber}`}
                            fill
                            className="object-contain"
                        />
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="secondary" size="icon" asChild>
                                <a href={generatedPage.pageDataUri} download={`page_${generatedPage.pageNumber}.png`}>
                                    <Download />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }
        return (
             <div className="text-center text-muted-foreground p-4">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4">Output will be displayed here once generated.</p>
            </div>
        )
    }

    if (isPageLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>;
    }

    const isAdmin = userProfile?.isAdmin === true;
    const isWip = siteConfig?.generateWip === false && !isAdmin;

    if (isWip) {
        return <WipPage />;
    }

    return (
        <>
            {isLoading && <LoadingAnimation text={loadingText} />}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-pane relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="font-headline">Input Content</CardTitle>
                        <CardDescription>Provide the text for your study note.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="text">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="text"><Type className="w-4 h-4 mr-2"/>Type/Paste</TabsTrigger>
                                <TabsTrigger value="upload"><FileText className="w-4 h-4 mr-2"/>Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="text" className="mt-4">
                                <Textarea
                                    placeholder="Paste your assignment text here, or upload a document."
                                    className="min-h-[300px] bg-background/50"
                                    value={textContent}
                                    onChange={handleTextChange}
                                />
                            </TabsContent>
                            <TabsContent value="upload" className="mt-4">
                                <FileUploader
                                    onFileUpload={handleFileUpload}
                                    acceptedFiles={['application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter>
                        <Button variant="glow" onClick={handleGenerateClick} disabled={!textContent || isLoading}>
                            Generate Study Note
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="glass-pane relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="font-headline">Generated Output</CardTitle>
                        <CardDescription>Your AI-generated study note will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[365px] flex items-center justify-center bg-background/30 rounded-md p-0 md:p-6">
                        {renderOutputContent()}
                    </CardContent>
                     {generatedPage && <CardFooter className="justify-end">
                        <Button variant="outline" asChild>
                            <a href={generatedPage.pageDataUri} download={`page_${generatedPage.pageNumber}.png`}>
                                <Download className="mr-2"/>
                                Download PNG
                            </a>
                        </Button>
                    </CardFooter>}
                </Card>
            </div>
        </>
    );
}
