
import type { Requirement } from './supabaseClient';
import techniqueDetails from '@/data/uxTechniqueDetails.json';

interface TechniqueDetail {
  name: string;
  slug: string;
  stage: string;
  outcomes: string[];
  output_types: string[];
  device_types: string[];
  project_types: ("New" | "Old")[];
  user_base: ("new" | "existing")[]; // Added user_base property
}

const allTechniques: TechniqueDetail[] = techniqueDetails as TechniqueDetail[];

/**
 * Retrieves a filtered list of UX techniques based on project requirements,
 * applying lenient output_type filtering for early stages and strict for later stages.
 * @param requirement - The user's selections for the project.
 * @returns An object where keys are 5D stages and values are arrays of recommended technique objects.
 */
export function getFilteredTechniques(requirement: Requirement): Record<string, {name: string, slug: string}[]> {
  const recommendations: Record<string, {name: string, slug: string}[]> = {
    Discover: [],
    Define: [],
    Design: [],
    Develop: [],
    Deliver: [],
  };

  if (!requirement) return recommendations;

  const doArraysIntersect = (reqArray: string[] | undefined, techArray: string[]) => {
    if (!reqArray || reqArray.length === 0) return true;
    if (!techArray || techArray.length === 0) return true;
    return reqArray.some(item => techArray.includes(item));
  };

  allTechniques.forEach(tech => {
    const projectTypeMatch = requirement.project_type
      ? tech.project_types.some(pType => pType.toLowerCase() === requirement.project_type!.toLowerCase())
      : true;

    // New logic for matching based on existing users
    const userContext = requirement.existing_users ? "existing" : "new";
    const userBaseMatch = tech.user_base ? tech.user_base.includes(userContext) : true;

    const outcomeMatch = doArraysIntersect(requirement.outcome, tech.outcomes);
    const deviceTypeMatch = doArraysIntersect(requirement.device_type, tech.device_types);

    const earlyStages = ["Discover", "Define", "Design"];
    const isEarlyStage = earlyStages.includes(tech.stage);
    const outputTypeMatch = isEarlyStage || doArraysIntersect(requirement.output_type, tech.output_types);

    if (projectTypeMatch && outcomeMatch && deviceTypeMatch && outputTypeMatch && userBaseMatch) {
      if (recommendations[tech.stage] && !recommendations[tech.stage].find(t => t.name === tech.name)) {
        recommendations[tech.stage].push({ name: tech.name, slug: tech.slug });
      }
    }
  });

  // Ensure stages from the original full list are present even if empty
  const allStages = ["Discover", "Define", "Design", "Develop", "Deliver"];
  allStages.forEach(stage => {
      if (!recommendations[stage]) {
          recommendations[stage] = [];
      }
  });

  return recommendations;
}

    