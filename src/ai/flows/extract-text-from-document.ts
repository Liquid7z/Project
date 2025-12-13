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
import * as fs from 'fs';

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
  previewDataUri: z.string().optional().describe('An image preview of the first page of the document, as a data URI.'),
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
    const documentBuffer = Buffer.from(documentDataBase64, 'base64');
    const canvas = await import('canvas');

    const generateGenericPreview = (fileType: string): string => {
        const { createCanvas } = canvas;
        const previewCanvas = createCanvas(400, 500);
        const ctx = previewCanvas.getContext('2d');
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(0, 0, 400, 500);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px "Space Grotesk"';
        ctx.textAlign = 'center';
        ctx.fillText(fileType.toUpperCase(), 200, 230);
        ctx.font = '20px "Inter"';
        ctx.fillText('Preview not available', 200, 270);
        return previewCanvas.toDataURL();
    };

    if (input.documentDataUri.startsWith('data:application/pdf;base64,')) {
      console.log('Detected PDF document.');
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdfData = Buffer.from(documentDataBase64, 'base64');
      const doc = await getDocument({ data: pdfData }).promise;

      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => (item as any).str).join(' ');
      }

      // Generate preview from the first page
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.5 });
      const canvasFactory = new canvas.CanvasFactory();
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
      const renderContext = {
        canvasContext: canvasAndContext.context,
        viewport: viewport,
        canvasFactory: canvasFactory,
      };
      await firstPage.render(renderContext).promise;
      const previewDataUri = canvasAndContext.canvas.toDataURL();

      return { extractedText: fullText, previewDataUri: previewDataUri };

    } else if (input.documentDataUri.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,')) {
      console.log('Detected DOCX document.');
      const mammoth = await import('mammoth');
      const { value: extractedText } = await mammoth.extractRawText({ buffer: documentBuffer });
      const previewDataUri = generateGenericPreview('DOCX');
      return { extractedText, previewDataUri };
    } else {
      console.log('Unsupported document type.');
      const fileType = input.documentDataUri.substring(input.documentDataUri.indexOf('/') + 1, input.documentDataUri.indexOf(';'));
      const previewDataUri = generateGenericPreview(fileType);
      return { extractedText: `Content from ${fileType} file.`, previewDataUri };
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
