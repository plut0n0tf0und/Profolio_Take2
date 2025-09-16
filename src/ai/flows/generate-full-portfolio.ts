
'use server';
/**
 * @fileOverview An AI agent that generates a comprehensive portfolio from all of a user's remixed techniques.
 *
 * - generateFullPortfolio - A function that returns a structured portfolio aggregating all techniques.
 * - FullPortfolioInput - The input type for the generateFullPortfolio function.
 * - FullPortfolioOutput - The return type for the generateFullPortfolio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { RemixedTechnique } from '@/lib/supabaseClient';

const FullPortfolioInputSchema = z.array(z.object({
  project_id: z.string().uuid().nullable().optional(),
  project_name: z.string(), // Added for grouping
  technique_name: z.string(),
  date: z.string().optional(),
  duration: z.string().optional(),
  teamSize: z.string().optional(),
  why: z.string().optional(),
  overview: z.string().optional(),
  problemStatement: z.string().optional(),
  role: z.string().optional(),
  prerequisites: z.array(z.object({ text: z.string(), checked: z.boolean() })).optional(),
  executionSteps: z.array(z.object({ text: z.string(), checked: z.boolean() })).optional(),
}));
export type FullPortfolioInput = z.infer<typeof FullPortfolioInputSchema>;

const ProjectPortfolioSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  tags: z.array(z.string()).describe('Relevant tags for the project, like "Wireframe", "Quantitative", "Mobile".'),
  meta: z.object({
    date: z.string().describe('The overall date range of the project work.'),
    duration: z.string().describe('The total duration of all work.'),
    teamSize: z.string().describe('The size of the team involved.'),
    role: z.string().describe('The user\'s primary role in this project.'),
  }),
  whyAndProblem: z.string().describe("A concise, professionally rewritten paragraph combining the 'why' and 'problem statement'."),
  introduction: z.string().describe("A compelling summary of the project's purpose and the user's high-level involvement."),
  approach: z.array(z.string()).describe("Bulleted professional summary of the overall approach, 4–6 bullets."),
  prerequisites: z.array(z.object({
    technique: z.string(),
    bullets: z.array(z.string())
  })).describe("Each technique with polished prerequisite bullets."),
  executionSteps: z.array(z.object({
    technique: z.string(),
    bullets: z.array(z.string())
  })).describe("Each technique with professional execution bullets."),
  impactOnDesign: z.array(z.string()).describe("3–5 concise, professional bullets summarizing design impact."),
});

const FullPortfolioOutputSchema = z.object({
  projects: z.array(ProjectPortfolioSchema),
});
export type FullPortfolioOutput = z.infer<typeof FullPortfolioOutputSchema>;

// The input to this function will be slightly different from the AI flow's input
// as we need to associate project names.
export type EnrichedRemixedTechnique = RemixedTechnique & { project_name: string };

export async function generateFullPortfolio(input: EnrichedRemixedTechnique[]): Promise<FullPortfolioOutput> {
  const flowInput = input.map(item => ({
    project_id: item.project_id,
    project_name: item.project_name,
    technique_name: item.technique_name,
    date: item.date,
    duration: item.duration,
    teamSize: item.teamSize,
    why: item.why,
    overview: item.overview,
    problemStatement: item.problemStatement,
    role: item.role,
    prerequisites: item.prerequisites,
    executionSteps: item.executionSteps,
  }));
  return generateFullPortfolioFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'generateFullPortfolioPrompt',
  input: { schema: z.object({ inputJsonString: z.string() }) },
  output: { schema: FullPortfolioOutputSchema },
  prompt: `You are a world-class UX portfolio writer. Your task is to transform a collection of a user's raw notes about various UX projects and techniques into a single, polished, professional portfolio document.

You will receive a JSON string representing an array of 'remixed techniques'. Each technique is associated with a project. You must group these techniques by 'project_name' and generate a cohesive case study for each project.

Here is the user's data:
{{{inputJsonString}}}

Follow these instructions carefully for each project group:
1. **projectName**: Use the project's name.
2. **tags**: Infer a set of relevant tags for the entire project based on all techniques used.
3. **meta**: Aggregate metadata. For date and duration, create a reasonable aggregate. Use the most common role.
4. **whyAndProblem**: Combine the 'why' and 'problemStatement' into one clear, professional paragraph.
5. **introduction**: Write a strong introduction summarizing the project's purpose and the user's role.
6. **approach**: Summarize the overall process in 4–6 clear bullets. Each bullet should describe a major activity or milestone, not micro-steps.
7. **prerequisites**: For each technique, rewrite the prerequisites into 1–2 professional bullets. Keep techniques separate.
8. **executionSteps**: For each technique, rewrite the execution steps into 2–4 professional bullets. Example:
   {
     "technique": "User Interviews",
     "bullets": [
       "Conducted 10 in-depth user interviews",
       "Synthesized findings into recurring pain points"
     ]
   }
9. **impactOnDesign**: Write 3–5 concise, professional bullets summarizing the overall design impact.

Rules:
- Only include techniques that exist in the input for that project.
- Rewrite user input into professional, clear, modern English. Avoid slang, overly fancy words, or old-fashioned phrasing.
- Keep everything structured exactly as above. Do not merge bullets into paragraphs.
- All actions and outcomes must be in the past tense.

Return the final result as a JSON object strictly following the output schema.
`,
});

const generateFullPortfolioFlow = ai.defineFlow(
  {
    name: 'generateFullPortfolioFlow',
    inputSchema: FullPortfolioInputSchema,
    outputSchema: FullPortfolioOutputSchema,
  },
  async (input) => {
    const { output, usage } = await prompt({
      inputJsonString: JSON.stringify(input, null, 2)
    });
    if (!output) {
      console.error("AI flow 'generateFullPortfolioFlow' failed to produce an output.", { usage });
      throw new Error('Failed to generate full portfolio.');
    }
    return output;
  }
);
