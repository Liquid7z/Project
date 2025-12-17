
'use server';
/**
 * @fileOverview AI flow for generating a skill tree from a topic.
 *
 * - generateSkillTreeFromTopic - Generates a hierarchical structure of subjects and notes.
 * - GenerateSkillTreeInput - Input schema for the flow.
 * - GenerateSkillTreeOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schema for a single node in the skill tree
const SkillTreeNodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node (e.g., "quantum-mechanics").'),
  label: z.string().describe('The display name of the topic (e.g., "Quantum Mechanics").'),
  type: z.enum(['key-concept', 'main-idea', 'detail', 'sub-detail']).describe("The node's level in the hierarchy: 'key-concept' (root), 'main-idea' (L1), 'detail' (L2), or 'sub-detail' (L3)."),
  isPlaceholder: z.boolean().optional().describe('True if this node is a placeholder and not a real entity yet.'),
});

// Define Zod schema for an edge connecting two nodes
const SkillTreeEdgeSchema = z.object({
  id: z.string().describe('A unique identifier for the edge (e.g., "concept->idea-1").'),
  source: z.string().describe('The ID of the source (parent) node.'),
  target: z.string().describe('The ID of the target (child) node.'),
});

// Define Zod schemas for the flow's input and output
const GenerateSkillTreeInputSchema = z.object({
  topic: z.string().describe('The central topic for which to generate a skill tree.'),
});
export type GenerateSkillTreeInput = z.infer<typeof GenerateSkillTreeInputSchema>;

const GenerateSkillTreeOutputSchema = z.object({
  nodes: z.array(SkillTreeNodeSchema).describe('A list of all the topics and sub-topics in the skill tree.'),
  edges: z.array(SkillTreeEdgeSchema).describe('A list of all the connections between the nodes.'),
});
export type GenerateSkillTreeOutput = z.infer<typeof GenerateSkillTreeOutputSchema>;


const generateSkillTreePrompt = ai.definePrompt({
  name: 'generateSkillTreePrompt',
  input: { schema: GenerateSkillTreeInputSchema },
  output: { schema: GenerateSkillTreeOutputSchema },
  prompt: `You are an expert curriculum designer tasked with creating a detailed, hierarchical skill tree for a given topic.

Topic: "{{topic}}"

Generate a four-level skill tree with the following structure:

1.  **Level 0 (key-concept):** The single root node representing the main topic.
2.  **Level 1 (main-idea):** 2-3 key pillars or major sub-divisions that branch directly from the root topic.
3.  **Level 2 (detail):** 2-4 core concepts that branch from each 'main-idea'. These should be the essential components of the parent idea.
4.  **Level 3 (sub-detail):** 2-4 specific facts, examples, or sub-skills that branch from each 'detail'. These are the most granular points.

**Instructions:**
*   Create a valid JSON object with 'nodes' and 'edges'.
*   Each node must have a unique 'id' (slug-case), a 'label' (display name), and a 'type' ('key-concept', 'main-idea', 'detail', or 'sub-detail').
*   Each edge must connect a parent to a child, ensuring a strict four-level hierarchy.
*   Ensure all nodes are connected. There should be no orphaned nodes.

Example for the topic "Cooking":
{
  "nodes": [
    { "id": "cooking", "label": "Cooking", "type": "key-concept" },
    { "id": "knife-skills", "label": "Knife Skills", "type": "main-idea" },
    { "id": "heat-management", "label": "Heat Management", "type": "main-idea" },
    { "id": "dicing", "label": "Dicing", "type": "detail" },
    { "id": "julienne", "label": "Julienne", "type": "detail" },
    { "id": "uniform-cuts", "label": "Uniform Cuts", "type": "sub-detail" },
    { "id": "blade-safety", "label": "Blade Safety", "type": "sub-detail" }
  ],
  "edges": [
    { "id": "e-cook-knife", "source": "cooking", "target": "knife-skills" },
    { "id": "e-cook-heat", "source": "cooking", "target": "heat-management" },
    { "id": "e-knife-dicing", "source": "knife-skills", "target": "dicing" },
    { "id": "e-knife-julienne", "source": "knife-skills", "target": "julienne" },
    { "id": "e-dicing-uniform", "source": "dicing", "target": "uniform-cuts" },
    { "id": "e-dicing-safety", "source": "dicing", "target": "blade-safety" }
  ]
}

Now, generate the complete skill tree for the topic: "{{topic}}".
`,
});


const generateSkillTreeFlow = ai.defineFlow(
  {
    name: 'generateSkillTreeFlow',
    inputSchema: GenerateSkillTreeInputSchema,
    outputSchema: GenerateSkillTreeOutputSchema,
  },
  async (input) => {
    const { output } = await generateSkillTreePrompt(input);
    
    if (!output) {
        throw new Error('AI failed to generate a skill tree.');
    }
    
    // Mark all generated nodes as placeholders
    const placeholderNodes = output.nodes.map(node => ({ ...node, isPlaceholder: true }));

    return {
        nodes: placeholderNodes,
        edges: output.edges,
    };
  }
);


// Wrapper function to be called from server actions
export async function generateSkillTreeFromTopic(input: GenerateSkillTreeInput): Promise<GenerateSkillTreeOutput> {
  return generateSkillTreeFlow(input);
}
