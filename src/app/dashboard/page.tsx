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
import { Download, FileText, Type } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import jsPDF from 'jspdf';

type GeneratedPage = {
    pageNumber: number;
    pageDataUri: string;
};

export default function GeneratePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Processing...');
    const [textContent, setTextContent] = useState('');
    const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);

    const handleFileUpload = async (file: File) => {
        setIsLoading(true);
        setLoadingText('Extracting text...');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const documentDataUri = reader.result as string;
                const result = await extractTextAction({ documentDataUri });
                setTextContent(result.extractedText);
            } catch (error) {
                console.error("Failed to extract text:", error);
                // In a real app, show a toast notification
            } finally {
                setIsLoading(false);
            }
        };
    };

    const handleGenerate = async () => {
        if (!textContent) return;
        setIsLoading(true);
        setLoadingText('Generating handwriting...');
        setGeneratedPages([]);
        try {
            // In a real app, you would get the user's style model ID
            const result = await generateAssignmentAction({
                content: textContent,
                handwritingStyleModelId: 'placeholder-style-model-id',
            });
            setGeneratedPages(result.assignmentPages);
        } catch (error) {
            console.error("Failed to generate assignment:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (generatedPages.length === 0) return;

        setIsLoading(true);
        setLoadingText('Creating PDF...');

        // Using dynamic import for jspdf
        const { default: jsPDF } = await import('jspdf');
        
        const doc = new jsPDF();
        
        for (let i = 0; i < generatedPages.length; i++) {
            if (i > 0) {
                doc.addPage();
            }
            const imgData = generatedPages[i].pageDataUri;
            
            const img = document.createElement('img');
            img.src = imgData;

            await new Promise((resolve) => {
                img.onload = () => {
                    const pdfWidth = doc.internal.pageSize.getWidth();
                    const pdfHeight = doc.internal.pageSize.getHeight();
                    const imgWidth = img.width;
                    const imgHeight = img.height;
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

                    const newWidth = imgWidth * ratio;
                    const newHeight = imgHeight * ratio;

                    const x = (pdfWidth - newWidth) / 2;
                    const y = (pdfHeight - newHeight) / 2;
                    
                    doc.addImage(imgData, 'PNG', x, y, newWidth, newHeight);
                    resolve(true);
                }
            });
        }
        
        doc.save('assignment.pdf');
        setIsLoading(false);
    };

    return (
        <div className="grid gap-6">
            {isLoading && <LoadingAnimation text={loadingText} />}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="glass-pane">
                    <CardHeader>
                        <CardTitle className="font-headline">Input Content</CardTitle>
                        <CardDescription>Provide the text for your assignment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="text">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="text"><Type className="w-4 h-4 mr-2"/>Type/Paste</TabsTrigger>
                                <TabsTrigger value="upload"><FileText className="w-4 h-4 mr-2"/>Upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="text" className="mt-4">
                                <Textarea
                                    placeholder="Below are *[how-to-understand notes for 'Problem Solving using C++' strictly based on your **'GTU(B.Tech CSE - 1st Sem Choice based)' syllabus(**'BTCS1101 syllabus(B.Tech CSE - 1st Sem Choice... The language is kept 'hyper-simple, exam-oriented, and beginner-friendly...*. Suitable for quick study and revision... # Problem Solving Using C ... Fairy... "
                                    className="min-h-[300px] bg-background/50"
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                />
                            </TabsContent>
                            <TabsContent value="upload" className="mt-4">
                                <FileUploader
                                    onFileUpload={handleFileUpload}
                                    acceptedFiles={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter>
                        <Button variant="glow" onClick={handleGenerate} disabled={!textContent || isLoading}>
                            Generate Handwriting
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="glass-pane">
                    <CardHeader>
                        <CardTitle className="font-headline">Generated Output</CardTitle>
                        <CardDescription>Your handwritten assignment will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent className="min-h-[365px] flex items-center justify-center bg-background/30 rounded-md p-0 md:p-6">
                        {generatedPages.length > 0 ? (
                            <Carousel className="w-full max-w-xs">
                                <CarouselContent>
                                    {generatedPages.map((page, index) => (
                                    <CarouselItem key={index}>
                                        <div className="p-1">
                                             <div className="w-full aspect-[3/4] relative group">
                                                <Image
                                                    src={page.pageDataUri}
                                                    alt={`Generated page ${page.pageNumber}`}
                                                    fill
                                                    className="object-contain"
                                                />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="secondary" size="icon" asChild>
                                                        <a href={page.pageDataUri} download={`page_${page.pageNumber}.png`}>
                                                            <Download />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious />
                                <CarouselNext />
                            </Carousel>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <p>Output will be displayed here once generated.</p>
                            </div>
                        )}
                    </CardContent>
                     {generatedPages.length > 0 && <CardFooter className="justify-end">
                        <Button variant="outline" onClick={handleDownloadPdf}>Download All as PDF</Button>
                    </CardFooter>}
                </Card>
            </div>
        </div>
    );
}
