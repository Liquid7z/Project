'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { extractTextAction } from '@/actions/generation';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import { AlertCircle, FileWarning } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

const PDF_WORKER_VERSION = '4.0.379';
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_WORKER_VERSION}/pdf.worker.min.mjs`;

interface DocumentPreviewerProps {
    fileURL: string;
    fileType: string;
    fileName: string;
    isCardPreview?: boolean;
}

const PDFViewer = ({ fileUrl, isCardPreview }: { fileUrl: string; isCardPreview?: boolean }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.5);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const renderPage = useCallback(async (doc: any, pageNum: number, currentScale: number) => {
        try {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentScale });
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext('2d');
            if(!context) return;
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
        } catch (e) {
            console.error("Error rendering page", e);
            setError("Could not render PDF page.");
        }
    }, []);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const loadingTask = getDocument(fileUrl);
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
            } catch (err: any) {
                console.error("Error loading PDF:", err);
                setError(err.message || 'Failed to load PDF.');
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();
    }, [fileUrl]);
    
    useEffect(() => {
        if (pdfDoc) {
            renderPage(pdfDoc, currentPage, scale);
        }
    }, [pdfDoc, currentPage, scale, renderPage]);

    if (isLoading) return <Skeleton className="w-full h-96" />;
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!pdfDoc) return null;

    const numPages = pdfDoc.numPages;

    return (
         <div className="space-y-2">
            {!isCardPreview && (
                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted sticky top-0 z-10">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}><ChevronLeft/></Button>
                    <span>Page {currentPage} of {numPages}</span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}><ChevronRight/></Button>
                    <div className="w-[1px] h-6 bg-border mx-2" />
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut/></Button>
                </div>
            )}
            <div className="flex justify-center bg-muted/20 overflow-auto">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
};

const DocxPreviewer = ({ fileUrl, isCardPreview }: { fileUrl: string; isCardPreview?: boolean }) => {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndExtract = async () => {
            try {
                setIsLoading(true);
                setError(null);
                // Directly use the fileUrl if it's already a data URI, which it should be from storage
                const result = await extractTextAction({ documentDataUri: fileUrl });
                setContent(result.extractedText);
            } catch (err: any) {
                console.error("Error processing DOCX:", err);
                setError(err.message || 'Failed to process document.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndExtract();
    }, [fileUrl]);

    if (isLoading) return <Skeleton className="w-full h-64" />;
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;

    return <div className={`prose prose-sm dark:prose-invert p-4 rounded-md bg-muted/20 ${isCardPreview ? 'max-h-64 overflow-hidden' : ''}`} dangerouslySetInnerHTML={{ __html: content?.replace(/\n/g, '<br />') || '' }} />;
};


const FallbackPreview = ({ fileName }: { fileName: string }) => (
    <div className="flex flex-col items-center justify-center text-center p-4 h-full bg-muted/20 rounded-md">
        <FileWarning className="w-10 h-10 text-muted-foreground" />
        <p className="mt-4 font-semibold">{fileName}</p>
        <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
    </div>
);


export const DocumentPreviewer = ({ fileURL, fileType, fileName, isCardPreview = false }: DocumentPreviewerProps) => {
    
    if (!fileType || !fileURL) {
        return <FallbackPreview fileName={fileName || 'File'} />;
    }

    if (fileType.startsWith('image/')) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={fileURL} alt={fileName} className="max-w-full h-auto rounded-md" />;
    }

    if (fileType === 'application/pdf') {
        return <PDFViewer fileUrl={fileURL} isCardPreview={isCardPreview} />;
    }
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType.startsWith('text/') || fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return <DocxPreviewer fileUrl={fileURL} isCardPreview={isCardPreview} />;
    }

    return <FallbackPreview fileName={fileName} />;
};
