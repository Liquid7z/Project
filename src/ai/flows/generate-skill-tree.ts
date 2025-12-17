'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit/zod';

const NodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node (e.g., "1", "1.1", "1.1.1").'),
  label: z.string().describe('A concise title for the skill or concept (max 5 words).'),
  type: z.enum(['root', 'pillar', 'concept', 'detail']).describe('The hierarchical level of the node.'),
  children: z.array(z.lazy(() => NodeSchema)).optional().describe('Child nodes representing sub-topics.'),
});

export const GenerateSkillTreeInputSchema = z.object({
  topic: z.string().describe('The central topic for which to generate a skill tree.'),
});
export type GenerateSkillTreeInput = z.infer<typeof GenerateSkillTreeInputSchema>;

export const GenerateSkillTreeOutputSchema = z.object({
  tree: NodeSchema.describe('The root node of the generated skill tree.'),
});
export type GenerateSkillTreeOutput = z.infer<typeof GenerateSkillTreeOutputSchema>;

export async function generateSkillTree(input: GenerateSkillTreeInput): Promise<GenerateSkillTreeOutput> {
  return generateSkillTreeFlow(input);
}

const generateSkillTreeFlow = ai.defineFlow(
  {
    name: 'generateSkillTreeFlow',
    inputSchema: GenerateSkillTreeInputSchema,
    outputSchema: GenerateSkillTreeOutputSchema,
  },
  async (input) => {
    const prompt = `Generate a hierarchical skill tree for the topic: "${input.topic}".

The structure must be a JSON object with a root node. The hierarchy should be at least 3 levels deep and follow this structure:
- Level 0 (root): The main topic itself.
- Level 1 (pillar): The major sub-divisions or foundational pillars of the topic.
- Level 2 (concept): The core concepts or key areas within each pillar.
- Level 3 (detail): Specific details, examples, or sub-skills for each concept.

Rules:
- Each node must have a unique 'id', a short 'label' (max 5 words), and a 'type' ('root', 'pillar', 'concept', or 'detail').
- The 'children' array should contain the nodes for the next level down.
- Ensure all labels are concise and clear for a visual diagram.
- Generate a rich, well-structured tree. For a topic like "React.js", you should have multiple pillars like "Core Concepts", "Hooks", "State Management", and "Ecosystem".
`;

    const llmResponse = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      config: {
        temperature: 0.3,
      },
      output: {
        schema: GenerateSkillTreeOutputSchema,
      },
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error('Failed to generate skill tree. The model returned no output.');
    }

    return output;
  }
);
