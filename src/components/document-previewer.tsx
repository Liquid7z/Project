'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Note } from '@/app/dashboard/notes/[subjectId]/page';
import { Skeleton } from '@/components/ui/skeleton';
import { extractTextAction } from '@/actions/generation';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import { AlertCircle, FileWarning } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Set workerSrc for pdf.js. This is crucial for it to work with Next.js/Webpack.
// We point it to a copy of the worker file hosted on a CDN.
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(getDocument as any).version}/pdf.worker.min.mjs`;

async function fileUrlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not ok.');
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const PDFViewer = ({ fileUrl, isCardPreview }: { fileUrl: string; isCardPreview?: boolean }) => {
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const renderPage = useCallback(async (doc: any, pageNum: number, canvas: HTMLCanvasElement) => {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
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
    
    const canvasRefs = useMemo(() => Array(pdfDoc?.numPages || 0).fill(0).map(() => React.createRef<HTMLCanvasElement>()), [pdfDoc]);

    useEffect(() => {
        if (pdfDoc) {
            const pagesToRender = isCardPreview ? [1] : Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
            pagesToRender.forEach(pageNum => {
                const canvas = canvasRefs[pageNum - 1]?.current;
                if (canvas) {
                    renderPage(pdfDoc, pageNum, canvas);
                }
            });
        }
    }, [pdfDoc, renderPage, canvasRefs, isCardPreview]);

    if (isLoading) return <Skeleton className="w-full h-64" />;
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!pdfDoc) return null;

    return (
         <div className={isCardPreview ? "overflow-hidden" : "space-y-4"}>
            {Array.from({ length: isCardPreview ? 1 : pdfDoc.numPages }, (_, i) => i + 1).map(pageNum => (
                <div key={pageNum} className="flex justify-center bg-muted/20">
                    <canvas ref={canvasRefs[pageNum - 1]} />
                </div>
            ))}
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
                const dataUri = await fileUrlToDataUri(fileUrl);
                const result = await extractTextAction({ documentDataUri: dataUri });
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

    return <div className={`prose prose-sm dark:prose-invert ${isCardPreview ? 'max-h-64 overflow-hidden' : ''}`}>{content}</div>;
};

const FallbackPreview = ({ note }: { note: Note }) => (
    <div className="flex flex-col items-center justify-center text-center p-4 h-full bg-muted/20 rounded-md">
        <FileWarning className="w-10 h-10 text-muted-foreground" />
        <p className="mt-4 font-semibold">{note.originalFileName}</p>
        <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
    </div>
);


export const DocumentPreviewer = ({ note, isCardPreview = false }: { note: Note; isCardPreview?: boolean }) => {
    if (!note.fileURL || !note.fileType) {
        return <p>Document not available.</p>;
    }

    const fileType = note.fileType;

    if (fileType === 'application/pdf') {
        return <PDFViewer fileUrl={note.fileURL} isCardPreview={isCardPreview} />;
    }
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return <DocxPreviewer fileUrl={note.fileURL} isCardPreview={isCardPreview} />;
    }

    return <FallbackPreview note={note} />;
};
    