
'use server';
/**
 * @fileOverview An AI agent that generates a portfolio-ready case study from user-provided technique data.
 *
 * - generatePortfolio - A function that returns a structured portfolio.
 * - PortfolioInput - The input type for the generatePortfolio function.
 * - PortfolioOutput - The return type for the generatePortfolio function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { RemixedTechnique } from '@/lib/supabaseClient';

// We redefine the input schema here for the AI flow, based on RemixedTechnique
const PortfolioInputSchema = z.object({
  technique_name: z.string(),
  project_id: z.string().uuid().nullable().optional(),
  date: z.string().optional(),
  duration: z.string().optional(),
  teamSize: z.string().optional(),
  why: z.string().optional(),
  overview: z.string().optional(),
  problemStatement: z.string().optional(),
  role: z.string().optional(),
  prerequisites: z.array(z.object({ text: z.string(), checked: z.boolean() })).optional(),
  executionSteps: z.array(z.object({ text: z.string(), checked: z.boolean() })).optional(),
  attachments: z.any().optional(), // AI doesn't need attachments content
});
export type PortfolioInput = z.infer<typeof PortfolioInputSchema>;

const PortfolioOutputSchema = z.object({
  title: z.string().describe('The main title for the portfolio piece, which is the name of the UX technique used.'),
  tags: z.array(z.string()).describe('A list of relevant tags or keywords from the project, like "Wireframe", "Quantitative", "Mobile", "New Project".'),
  meta: z.object({
    date: z.string().describe('The date the project or technique was executed.'),
    duration: z.string().describe('The duration of the work.'),
    teamSize: z.string().describe('The size of the team involved.'),
  }),
  why: z.string().describe("A concise, professionally rewritten paragraph explaining why this specific UX technique was chosen."),
  overview: z.string().describe("A compelling summary of the project. If the user provided an overview, rewrite it to be more professional and impactful for a portfolio. If not, generate one based on other fields. Highlight the key actions taken and the results."),
  problemStatement: z.string().describe("The user's problem statement, rewritten to be clear, concise, and compelling for a portfolio."),
  roleAndResponsibilities: z.array(z.string()).describe("A bulleted list of the user's role and key responsibilities in this project. Infer this from the user's provided role and the tasks they performed."),
  impactOnDesign: z.string().describe("A paragraph summarizing the impact of this work on the final design or project outcome. Explain how the findings influenced decisions and led to improvements."),
  prerequisites: z.array(z.string()).describe("A bulleted list describing the prerequisites that were completed. Rewrite the user's input into professional, past-tense sentences."),
  executionSteps: z.array(z.string()).describe("A bulleted list describing the execution steps that were taken. Rewrite the user's input into professional, past-tense sentences."),
});
export type PortfolioOutput = z.infer<typeof PortfolioOutputSchema>;


export async function generatePortfolio(input: RemixedTechnique): Promise<PortfolioOutput> {
  // We can also fetch associated project details here if needed, e.g. project name
  // For now, we'll pass the data we have.
  const flowInput: PortfolioInput = { ...input };
  return generatePortfolioFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'generatePortfolioPrompt',
  input: { schema: PortfolioInputSchema },
  output: { schema: PortfolioOutputSchema },
  prompt: `You are a world-class UX portfolio writer. Your task is to transform the user's raw notes about a UX project into a polished, professional case study section.

You will receive JSON data about a specific UX technique the user applied. Your job is to restructure, rewrite, and enhance this information to be clear, compelling, and ready for a portfolio. Ensure all descriptions of actions and outcomes are written in the past tense, as if describing a completed project.

Here is the user's data:
Technique Name: {{technique_name}}
Project Details:
- Date: {{date}}
- Duration: {{duration}}
- Team Size: {{teamSize}}
- Problem Statement: {{problemStatement}}
- Why this technique was used: {{why}}
- User's Role: {{role}}
- Overview/Plan: {{overview}}

- Prerequisites Checklist:
{{#each prerequisites}}
- {{text}} (Completed: {{checked}})
{{/each}}

- Execution Steps Checklist:
{{#each executionSteps}}
- {{text}} (Completed: {{checked}})
{{/each}}

Based on this, generate the complete JSON output. Follow these instructions carefully:
1.  **title**: Use the 'technique_name' as the main title.
2.  **tags**: Infer these from the project context. You are not given these directly. Make educated guesses.
3.  **meta**: Extract the date, duration, and teamSize directly.
4.  **why**: Rewrite the 'why' section to be concise and professional, using past tense (e.g., "This technique was chosen because...").
5.  **overview**: Rewrite the user's 'overview' into a powerful summary. Focus on actions taken and outcomes achieved, written in the past tense. If the overview is sparse, synthesize one from the problem statement and role.
6.  **problemStatement**: Rewrite the user's problem statement to be sharp and clear for an external audience.
7.  **roleAndResponsibilities**: Based on the user's 'role' and the tasks implied by the execution steps, create a bulleted list of 3-4 key responsibilities, described in the past tense (e.g., "Led user research...", "Analyzed findings...").
8.  **impactOnDesign**: Write a new paragraph describing the impact of this technique's findings on the project's design. This is the "so what?" of the story. Use past tense to describe how findings influenced the design.
9.  **prerequisites**: Rewrite the user's checklist items into a professional, bulleted list. Each item should be a past-tense sentence describing what was prepared (e.g., "Established clear research goals to guide the process.").
10. **executionSteps**: Rewrite the user's checklist items into a professional, bulleted list. Each item should be a past-tense sentence describing what action was performed (e.g., "Conducted interviews with five target users to gather qualitative insights.").
`,
});

const generatePortfolioFlow = ai.defineFlow(
  {
    name: 'generatePortfolioFlow',
    inputSchema: PortfolioInputSchema,
    outputSchema: PortfolioOutputSchema,
  },
  async (input) => {
    const { output, usage } = await prompt(input);
    if (!output) {
      console.error("AI flow 'generatePortfolioFlow' failed to produce an output.", { usage });
      throw new Error('Failed to generate portfolio details.');
    }
    // The schema for prereqs/steps in the output is different from the input.
    // We can't just copy them over. The AI is responsible for rewriting them.
    // This is a placeholder for the AI-generated content.
    return output;
  }
);
