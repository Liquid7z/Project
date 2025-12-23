
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
  prompt: `You are an expert educator and note-taker AI. Your task is to transform the user's input content into a single, comprehensive, and visually organized study note page. The output must be a single image data URI that looks like a digital, handwritten note on a white page.

The note page must follow a clear hierarchical structure (Parent → Child Flow).

1.  **Main Concept:** Start with a main key point that represents the high-level concept.
2.  **Child Points:** Under each main key point, list its related child points, such as Types, Properties, Characteristics, Functions, Uses, Advantages, Disadvantages, or Examples.
3.  **Sub-Child Points:** If a child point requires further explanation, expand it into sub-child points under that child heading.
4.  **Flow:** Follow a top-down explanation flow in this order: Main Concept → Sub-Concept → Detailed Points.
5.  **Conciseness:** Keep all text short, crisp, and easy to scan. Avoid long paragraphs.
6.  **Visuals:** Where appropriate, create simple diagrams or visuals that fit within this hierarchy.
7.  **Summary:** At the bottom, write a concise summary paragraph.

The structure should visually resemble a skill tree or an outline.

**Expected Structure Example:**

**Main Concept**
- **Types**
  - Type 1
  - Type 2
- **Properties**
  - Property A
  - Property B
- **Examples**
  - Example 1
  - Example 2

**Output Behavior Guidelines:**
- Never mix child points across different main concepts.
- Maintain consistent indentation and nesting.
- Use bullet or tree-style formatting.
- Prioritize clarity and logical flow.

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
