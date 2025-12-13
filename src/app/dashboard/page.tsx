'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/file-uploader';
import { generateAssignmentAction, extractTextAction, analyzeStyleAction } from '@/actions/generation';
import { LoadingAnimation } from '@/components/loading-animation';
import Image from 'next/image';
import { Download, FileText, Type, UploadCloud } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type GeneratedPage = {
    pageNumber: number;
    pageDataUri: string;
};

export default function GeneratePage() {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Processing...');
    const [textContent, setTextContent] = useState('');
    const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { toast } = useToast();

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

    const handleGenerateClick = () => {
        if (!textContent) {
            toast({
                variant: 'destructive',
                title: 'Input content is empty',
                description: 'Please type, paste, or upload content before generating.',
            });
            return;
        };
        setIsUploadModalOpen(true);
    };

    const handleHandwritingUpload = async (file: File) => {
        setIsUploadModalOpen(false);
        setIsLoading(true);
        
        // 1. Analyze handwriting
        setLoadingText('Analyzing your handwriting...');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const handwritingSampleDataUri = reader.result as string;
                const analysisResult = await analyzeStyleAction({ handwritingSampleDataUri });
                const styleModelId = analysisResult.styleModelId;

                if (!styleModelId) {
                    throw new Error("Handwriting analysis failed to return a model ID.");
                }

                // 2. Generate assignment with the new style
                setLoadingText('Generating your assignment...');
                const generationResult = await generateAssignmentAction({
                    content: textContent,
                    handwritingStyleModelId: styleModelId,
                });
                setGeneratedPages(generationResult.assignmentPages);

            } catch (error) {
                console.error("Failed to generate assignment:", error);
                 toast({
                    variant: "destructive",
                    title: "Generation Failed",
                    description: "An error occurred during the handwriting generation process."
                })
            } finally {
                setIsLoading(false);
            }
        };
         reader.onerror = () => {
            setIsLoading(false);
            toast({
                variant: "destructive",
                title: "File Read Error",
                description: "Could not read the uploaded handwriting sample."
            });
        };
    };

    const handleDownloadPdf = async () => {
        if (generatedPages.length === 0) return;

        setIsLoading(true);
        setLoadingText('Creating PDF...');

        const { default: jsPDF } = await import('jspdf');
        
        const doc = new jsPDF();
        
        for (let i = 0; i < generatedPages.length; i++) {
            if (i > 0) {
                doc.addPage();
            }
            const imgData = generatedPages[i].pageDataUri;
            
            const img = document.createElement('img');
            img.src = imgData;

            await new Promise<void>((resolve) => {
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
                    resolve();
                }
                 img.onerror = () => {
                    console.error(`Failed to load image for page ${i+1}`);
                    toast({
                        variant: 'destructive',
                        title: 'PDF Generation Error',
                        description: `Could not load page ${i+1} for the PDF.`,
                    });
                    resolve(); // Resolve to not block the process
                };
            });
        }
        
        doc.save('assignment.pdf');
        setIsLoading(false);
    };

    return (
        <>
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
                                    placeholder="Paste your assignment text here, or upload a document."
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
                        <Button variant="glow" onClick={handleGenerateClick} disabled={!textContent || isLoading}>
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
                            <div className="text-center text-muted-foreground p-4">
                                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <p className="mt-4">Output will be displayed here once generated.</p>
                            </div>
                        )}
                    </CardContent>
                     {generatedPages.length > 0 && <CardFooter className="justify-end">
                        <Button variant="outline" onClick={handleDownloadPdf}>Download All as PDF</Button>
                    </CardFooter>}
                </Card>
            </div>
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="glass-pane">
                    <DialogHeader>
                        <DialogTitle className="font-headline flex items-center gap-2"><UploadCloud /> Upload Handwriting Sample</DialogTitle>
                        <DialogDescription>
                            To generate the assignment in your style, please upload an image of your handwriting.
                            A clear, well-lit image on unlined paper works best.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                         <FileUploader onFileUpload={handleHandwritingUpload} />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
