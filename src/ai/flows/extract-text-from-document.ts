
'use server';
/**
 * @fileOverview Extracts text from a document (PDF/DOCX) using a tool.
 *
 * - extractTextFromDocument - A function that handles the text extraction process.
 * - ExtractTextFromDocumentInput - The input type for the extractTextFromDocument function.
 * - ExtractTextFromDocumentOutput - The return type for the extractTextFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

// On the client, the worker is needed for previews. This sets the path.
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(getDocument as any).version}/pdf.worker.min.mjs`;
}


const ExtractTextFromDocumentInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A document (PDF or DOCX), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromDocumentInput = z.infer<typeof ExtractTextFromDocumentInputSchema>;

const ExtractTextFromDocumentOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text from the document.'),
  previewDataUris: z.array(z.string()).optional().describe('Image previews of the document pages, as data URIs.'),
});
export type ExtractTextFromDocumentOutput = z.infer<typeof ExtractTextFromDocumentOutputSchema>;

export async function extractTextFromDocument(input: ExtractTextFromDocumentInput): Promise<ExtractTextFromDocumentOutput> {
  return extractTextFromDocumentFlow(input);
}

const extractTextTool = ai.defineTool({
    name: 'extractText',
    description: 'Extracts text from a document provided as a data URI.',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async (input) => {
    
    const documentDataBase64 = input.documentDataUri.split(',')[1];
    
    // This is a simplified, canvas-free SVG placeholder.
    const generateGenericPreview = (fileType: string): string => {
        const svg = `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="500" fill="#2d3748" />
            <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="30" fill="white" font-weight="bold">${fileType.toUpperCase()}</text>
            <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="20" fill="white">Preview not available</text>
        </svg>`;
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    };

    if (input.documentDataUri.startsWith('data:application/pdf;base64,')) {
      console.log('Detected PDF document.');
      const pdfData = Buffer.from(documentDataBase64, 'base64');
      
      // Temporarily disable worker for server-side execution and restore it after.
      const originalWorkerSrc = GlobalWorkerOptions.workerSrc;
      GlobalWorkerOptions.workerSrc = false as any;
      
      try {
        const doc = await getDocument({ data: new Uint8Array(pdfData.buffer) }).promise;

        let fullText = '';
        const previewDataUris: string[] = [];

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => (item as any).str).join(' ');
          
          // Since canvas is not available on the server, we generate a generic preview for each page.
          previewDataUris.push(generateGenericPreview(`PDF Page ${i}`));
        }
        
        return { extractedText: fullText, previewDataUris };

      } finally {
        // Restore the original worker source for client-side rendering.
        GlobalWorkerOptions.workerSrc = originalWorkerSrc;
      }

    } else if (input.documentDataUri.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,')) {
      console.log('Detected DOCX document.');
      const documentBuffer = Buffer.from(documentDataBase64, 'base64');
      const { value: extractedText } = await mammoth.extractRawText({ buffer: documentBuffer });
      const previewDataUris = [generateGenericPreview('DOCX')];
      return { extractedText, previewDataUris };
    } else {
      console.log('Unsupported document type.');
      const fileType = input.documentDataUri.substring(input.documentDataUri.indexOf('/') + 1, input.documentDataUri.indexOf(';'));
      const previewDataUris = [generateGenericPreview(fileType)];
      return { extractedText: `Content from ${fileType} file.`, previewDataUris };
    }
  }
);

const extractTextFromDocumentPrompt = ai.definePrompt({
  name: 'extractTextFromDocumentPrompt',
  tools: [extractTextTool],
  prompt: `You are a helpful assistant designed to extract text from a document.

  The user will provide a document. Extract the text from the document, and return it to the user.
  Use the extractText tool to extract the text from the document.
  `,
});

const extractTextFromDocumentFlow = ai.defineFlow(
  {
    name: 'extractTextFromDocumentFlow',
    inputSchema: ExtractTextFromDocumentInputSchema,
    outputSchema: ExtractTextFromDocumentOutputSchema,
  },
  async input => {
    const response = await extractTextTool(input);
    return response;
  }
);
