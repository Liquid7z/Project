
'use server';
/**
 * @fileOverview Generates handwritten assignments from input text, leveraging user-specific handwriting styles.
 *
 * - generateAssignment - The main function to generate the handwritten assignment.
 * - GenerateAssignmentInput - Input type for the generateAssignment function.
 * - GenerateAssignmentOutput - Output type for the generateAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAssignmentInputSchema = z.object({
  content: z.string().describe('The content of the assignment to be handwritten.'),
  handwritingStyleModelId: z.string().describe('The ID of the user\u0027s handwriting style model.'),
});
export type GenerateAssignmentInput = z.infer<typeof GenerateAssignmentInputSchema>;

const GenerateAssignmentOutputSchema = z.object({
  assignmentPages: z.array(
    z.object({
      pageNumber: z.number().describe('The page number of the assignment.'),
      pageDataUri: z
        .string()
        .describe(
          'The handwritten assignment page as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
        ),
    })
  ).describe('An array of data URIs, each representing a page of the handwritten assignment. If generation fails, this will be an empty array.'),
});
export type GenerateAssignmentOutput = z.infer<typeof GenerateAssignmentOutputSchema>;

export async function generateAssignment(input: GenerateAssignmentInput): Promise<GenerateAssignmentOutput> {
  return generateAssignmentFlow(input);
}

const generateAssignmentPrompt = ai.definePrompt({
  name: 'generateAssignmentPrompt',
  input: {schema: GenerateAssignmentInputSchema},
  output: {schema: GenerateAssignmentOutputSchema},
  prompt: `You are an expert educator and note-taker AI. Your task is to transform the user's input content into a single, comprehensive, and visually organized study note page.

The output must be a single image data URI that looks like a digital, handwritten note on a white page.

The note page should be structured as follows:

1.  **Title:** Create a clear title for the topic at the top of the page (e.g., "Week 1: Consumption Utility").
2.  **Key Concepts:** Identify and list 3-5 key questions or concepts from the content on the left-hand side.
3.  **Detailed Explanations:** On the right-hand side, provide detailed explanations, definitions, and examples for each key concept. Use color and highlights to emphasize important terms.
4.  **Diagrams/Visuals:** Where appropriate, create simple, clear diagrams, flowcharts, or graphs to visually represent the information. For example, you could create a mind map for "Consumption Utility" or a scatter plot for "Efficiency Frontier."
5.  **Summary:** At the bottom of the page, write a concise summary paragraph that ties all the key concepts together.

The overall style should be clean, easy to read, and visually appealing for studying and revision. It should look like a well-structured page from a student's digital notebook.

Use the handwriting style model ID provided: {{{handwritingStyleModelId}}}

User Content to transform:
{{{content}}}

Return a single page in the 'assignmentPages' array. The page number should be 1.
`,
});

const generateAssignmentFlow = ai.defineFlow(
  {
    name: 'generateAssignmentFlow',
    inputSchema: GenerateAssignmentInputSchema,
    outputSchema: GenerateAssignmentOutputSchema,
  },
  async input => {
    // In a real application, this would involve a complex image generation model.
    // We will simulate this by creating a placeholder image with the text.
    
    const {output} = await generateAssignmentPrompt(input);
    
    // Fallback to a mock response if the AI model fails to generate a valid output
    if (!output || !output.assignmentPages || output.assignmentPages.length === 0) {
      console.log("AI output was empty, generating mock data instead.");
      // The canvas-based mock is removed as canvas is not available.
      // The AI model is now solely responsible for generation.
      // If it fails, we return an empty array.
      return { assignmentPages: [] };
    }

    return output;
  }
);
