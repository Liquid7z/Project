
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
  type: z.enum(['key-concept', 'main-idea', 'detail']).describe("The node's level in the hierarchy: 'key-concept' (the root), 'main-idea' (level 1), or 'detail' (level 2)."),
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
  prompt: `You are an expert curriculum designer. Your task is to generate a hierarchical skill tree for a given topic.

Topic: "{{topic}}"

1.  **Identify the single Key Concept:** Start with one 'key-concept' node representing the main topic.
2.  **Branch into Main Ideas:** From the key concept, create 2-4 'main-idea' nodes. These are the primary pillars of the topic.
3.  **Add Supporting Details:** For each 'main-idea', generate 2-3 'detail' nodes. These are specific concepts, facts, or sub-skills.
4.  **Structure the Output:** Create a valid JSON object with 'nodes' and 'edges'.
    *   Each node needs a unique 'id' (slug-case), a 'label' (display name), and a 'type' ('key-concept', 'main-idea', or 'detail').
    *   Each edge connects a parent to a child (e.g., key-concept to main-idea, main-idea to detail).
5.  **Ensure Full Connectivity:** All nodes must be part of the tree. There should be no orphaned nodes.

Example for the topic "Machine Learning":
{
  "nodes": [
    { "id": "machine-learning", "label": "Machine Learning", "type": "key-concept" },
    { "id": "supervised-learning", "label": "Supervised Learning", "type": "main-idea" },
    { "id": "unsupervised-learning", "label": "Unsupervised Learning", "type": "main-idea" },
    { "id": "regression", "label": "Regression", "type": "detail" },
    { "id": "classification", "label": "Classification", "type": "detail" },
    { "id": "clustering", "label": "Clustering", "type": "detail" }
  ],
  "edges": [
    { "id": "edge-ml-supervised", "source": "machine-learning", "target": "supervised-learning" },
    { "id": "edge-ml-unsupervised", "source": "machine-learning", "target": "unsupervised-learning" },
    { "id": "edge-supervised-regression", "source": "supervised-learning", "target": "regression" },
    { "id": "edge-supervised-classification", "source": "supervised-learning", "target": "classification" },
    { "id": "edge-unsupervised-clustering", "source": "unsupervised-learning", "target": "clustering" }
  ]
}

Now, generate the skill tree for the topic: "{{topic}}".
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
