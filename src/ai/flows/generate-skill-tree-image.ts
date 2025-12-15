
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SkillTreeNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  isPlaceholder: z.boolean().optional(),
});

const SkillTreeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

const GenerateSkillTreeImageInputSchema = z.object({
    topic: z.string().describe("The central topic of the skill tree."),
    nodes: z.array(SkillTreeNodeSchema).describe("A list of all the topics and sub-topics in the skill tree."),
    edges: z.array(SkillTreeEdgeSchema).describe("A list of all the connections between the nodes."),
});
export type GenerateSkillTreeImageInput = z.infer<typeof GenerateSkillTreeImageInputSchema>;

const GenerateSkillTreeImageOutputSchema = z.object({
    imageDataUri: z.string().describe("The generated skill tree image as a data URI."),
});
export type GenerateSkillTreeImageOutput = z.infer<typeof GenerateSkillTreeImageOutputSchema>;

export async function generateSkillTreeImage(input: GenerateSkillTreeImageInput): Promise<GenerateSkillTreeImageOutput> {
    return generateSkillTreeImageFlow(input);
}

const generateImagePrompt = ai.definePrompt({
    name: 'generateSkillTreeImagePrompt',
    input: { schema: GenerateSkillTreeImageInputSchema },
    output: { schema: GenerateSkillTreeImageOutputSchema },
    prompt: `You are a graphic design AI. Your task is to generate a visually appealing mind map/skill tree image based on a set of nodes and edges.

Topic: "{{topic}}"

Nodes:
{{#each nodes}}
- id: {{this.id}}, label: "{{this.label}}", type: {{this.type}}
{{/each}}

Edges:
{{#each edges}}
- from: {{this.source}} to {{this.target}}
{{/each}}

Instructions:
1.  Create a clean, modern, and visually appealing image of the skill tree.
2.  The root node (type: 'key-concept') should be the most prominent.
3.  Use different colors or styles for 'key-concept', 'main-idea', and 'detail' nodes to show hierarchy.
4.  The layout should be clear and easy to follow, with nodes connected by lines as specified in the edges.
5.  The background should be transparent.
6.  The output must be a single image in PNG data URI format.

Return the result in the 'imageDataUri' field.
`,
});

const generateSkillTreeImageFlow = ai.defineFlow(
  {
    name: 'generateSkillTreeImageFlow',
    inputSchema: GenerateSkillTreeImageInputSchema,
    outputSchema: GenerateSkillTreeImageOutputSchema,
  },
  async (input) => {
    const { output } = await generateImagePrompt(input);

    if (!output || !output.imageDataUri) {
        // Fallback to a simple placeholder if AI fails
        console.warn("AI failed to generate skill tree image, using placeholder.");
        const placeholderUri = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f0f0f0" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#888">Image generation failed for "${input.topic}"</text></svg>`);
        return { imageDataUri: placeholderUri };
    }
    
    return output;
  }
);
