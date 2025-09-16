
import { createBrowserClient } from '@supabase/ssr';
import type { PostgrestError, User } from '@supabase/supabase-js';
import * as z from 'zod';
import { generateUUID } from './utils';

/*
================================================================================
REQUIRED RLS POLICIES FOR SUPABASE
Run these in the Supabase SQL Editor to fix data access issues.
================================================================================
*/
/*
-- 1. Make sure uuid-ossp extension is enabled if not already.
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- 2. RLS Policies for `requirements` table (Users can manage their own records)
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own requirements" ON public.requirements;
CREATE POLICY "Users can manage their own requirements" ON public.requirements FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. RLS Policies for `saved_results` table (Users can manage their own records)
ALTER TABLE public.saved_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own saved results" ON public.saved_results;
CREATE POLICY "Users can manage their own saved results" ON public.saved_results FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. RLS Policies for `remixed_techniques` table (Users can manage their own records)
-- This table has a Foreign Key: remixed_techniques.project_id -> saved_results.id
ALTER TABLE public.remixed_techniques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own remixed techniques" ON public.remixed_techniques;
CREATE POLICY "Users can manage their own remixed techniques" ON public.remixed_techniques FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Function to delete all of a user's data upon account deletion
CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void AS $$
BEGIN
  -- Delete from tables that reference auth.users, which will cascade
  DELETE FROM requirements WHERE user_id = auth.uid();
  DELETE FROM saved_results WHERE user_id = auth.uid();
  DELETE FROM remixed_techniques WHERE user_id = auth.uid();
  
  -- Finally, delete the user from auth.users itself
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;
*/

// Zod schema for validation, matches the 'requirements' table structure.
const RequirementSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().optional(),
  user_id: z.string().uuid().optional(),
  project_name: z.string().min(1, 'Project name is required.').nullable(),
  date: z.union([z.date(), z.string()]).optional(),
  problem_statement: z.string().optional(),
  role: z.string().optional(),
  output_type: z.array(z.string()).optional(),
  outcome: z.array(z.string()).optional(),
  device_type: z.array(z.string()).optional(),
  project_type: z.string().optional(),
  existing_users: z.boolean().nullable(),
});
export type Requirement = z.infer<typeof RequirementSchema>;

// Zod schema for the 'saved_results' table
const SavedResultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  requirement_id: z.string(),
  project_name: z.string().nullable(),
  role: z.string().nullable(),
  date: z.string().nullable(), // timestamp
  problem_statement: z.string().nullable(),
  output_type: z.array(z.string()).nullable(),
  outcome: z.array(z.string()).nullable(),
  device_type: z.array(z.string()).nullable(),
  stage_techniques: z.any().nullable(), // jsonb
  created_at: z.string().optional(), // timestamp
  existing_users: z.boolean().nullable(),
});
export type SavedResult = z.infer<typeof SavedResultSchema>;


// Schema for the remixed technique form data
const TechniqueRemixSchema = z.object({
    id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    project_id: z.string().uuid().nullable().optional(),
    created_at: z.string().optional(),
    technique_name: z.string(),
    date: z.string().optional(),
    duration: z.string().optional(),
    teamSize: z.string().optional(),
    why: z.string().optional(),
    overview: z.string().optional(),
    problemStatement: z.string().optional(),
    role: z.string().optional(),
    prerequisites: z.array(z.object({
        id: z.string(),
        text: z.string(),
        checked: z.boolean(),
    })).optional(),
    executionSteps: z.array(z.object({
        id: z.string(),
        text: z.string(),
        checked: z.boolean(),
    })).optional(),
    attachments: z.object({
        files: z.array(z.object({
            id: z.string(),
            description: z.string(),
            value: z.any()
        })).optional(),
        links: z.array(z.object({
            id: z.string(),
            description: z.string(),
            value: z.string()
        })).optional(),
        notes: z.array(z.object({
            id: z.string(),
            value: z.string()
        })).optional(),
    }).optional(),
    saved_results: z.any().optional(), // for joining data
});

export type RemixedTechnique = z.infer<typeof TechniqueRemixSchema>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export async function deleteUserAccount(): Promise<{ error: any | null }> {
    const { error } = await supabase.rpc('delete_user_data');
    if (error) console.error("Error deleting user account:", error);
    return { error };
}

export async function getUserProfile(): Promise<{ user: User | null; error: any | null }> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.error("Error fetching user profile:", error);
    return { user, error };
}

export async function updateUserProfile(updates: { full_name?: string; role?: string; company?: string; }): Promise<{ data: any | null; error: any | null }> {
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) console.error("Error updating user profile:", error);
    return { data, error };
}

export async function insertRequirement(
  requirement: Partial<Requirement>
): Promise<{ data: Requirement | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const requirementToInsert = {
    ...requirement,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('requirements')
    .insert([requirementToInsert])
    .select()
    .single();
  
  if (error) console.error("Error inserting requirement:", error);
  return { data, error };
}

export async function updateRequirement(
  id: string,
  updates: Partial<Requirement>
): Promise<{ data: Requirement | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { data, error } = await supabase
      .from('requirements')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

  if (error) console.error("Error updating requirement:", error);
  return { data, error };
}

export async function fetchRequirementsForUser(): Promise<{ data: Requirement[] | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { data, error } = await supabase
    .from('requirements')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) console.error("Error fetching requirements for user:", error);
  return { data, error };
}

export async function fetchRequirementById(
  id: string
): Promise<{ data: Requirement | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { data, error } = await supabase
    .from('requirements')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) console.error("Error fetching requirement by ID:", error);
  if (data?.date) data.date = new Date(data.date);

  return { data, error };
}


export async function saveOrUpdateResult(
  requirement: Requirement
): Promise<{ data: SavedResult | null; error: any | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated', code: '401' } };

    const dataToSave: Partial<SavedResult> = {
        user_id: user.id,
        requirement_id: requirement.id,
        project_name: requirement.project_name,
        role: requirement.role,
        date: typeof requirement.date === 'string' ? requirement.date : requirement.date?.toISOString(),
        problem_statement: requirement.problem_statement,
        output_type: requirement.output_type,
        outcome: requirement.outcome,
        device_type: requirement.device_type,
        stage_techniques: null, // This can be updated later
        existing_users: requirement.existing_users,
    };

    const { data: existingResult, error: selectError } = await supabase
      .from('saved_results')
      .select('id')
      .eq('requirement_id', requirement.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existingResult) {
      // It exists, just return it. The user may update details from the edit page.
      const { data, error } = await supabase
        .from('saved_results')
        .select('*')
        .eq('id', existingResult.id)
        .single();
      if (error) throw error;
      return { data, error: null };
    } else {
      // It doesn't exist, create it.
      const { data, error } = await supabase
        .from('saved_results')
        .insert(dataToSave)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    }
  } catch (error: any) {
    console.error("Error in saveOrUpdateResult:", error);
    return { data: null, error };
  }
}

export async function updateSavedResult(
  id: string,
  updates: Partial<SavedResult>
): Promise<{ data: SavedResult | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { data, error } = await supabase
    .from('saved_results')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) console.error("Error updating saved result:", error);
  return { data, error };
}

export async function fetchSavedResults(): Promise<{ data: SavedResult[] | null; error: PostgrestError | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

    const { data, error } = await supabase
        .from('saved_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) console.error("Error fetching saved results:", error);
    return { data, error };
}

export async function fetchSavedResultById(
  id: string
): Promise<{ data: SavedResult | null; error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { data, error } = await supabase
    .from('saved_results')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) console.error("Error fetching saved result by ID:", error);
  return { data, error };
}

export async function deleteSavedResult(id: string): Promise<{ error: PostgrestError | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

  const { error: techniquesError } = await supabase
    .from('remixed_techniques')
    .delete()
    .eq('project_id', id)
    .eq('user_id', user.id);

  if (techniquesError) {
    console.error('Error deleting associated techniques:', techniquesError);
    return { error: techniquesError };
  }

  const { error: projectError } = await supabase
    .from('saved_results')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (projectError) console.error("Error deleting saved result:", projectError);
  return { error: projectError };
}

export async function saveOrUpdateRemixedTechnique(
  techniqueData: Partial<RemixedTechnique> & { id?: string }
): Promise<{ data: RemixedTechnique | null; error: any | null }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not authenticated");

    let currentProjectId = techniqueData.project_id;

    // Create placeholder project if one is not provided.
    // This happens when a user remixes a technique without starting from a project.
    if (!currentProjectId) {
      const placeholderRequirement = {
        id: generateUUID(),
        user_id: user.id,
        project_name: `Standalone: ${techniqueData.technique_name || 'Remix'}`,
        date: new Date().toISOString(),
        role: techniqueData.role || 'N/A',
        problem_statement: techniqueData.problemStatement || 'N/A',
        // Provide default values for required arrays to satisfy schema
        output_type: [], 
        outcome: [],
        device_type: [],
      };
      
      const { data: newProject, error: projectError } = await supabase
        .from("saved_results")
        .insert(placeholderRequirement)
        .select("id")
        .single();

      if (projectError) {
        console.error("Failed to create placeholder project in saveOrUpdateRemixedTechnique:", projectError);
        return { data: null, error: projectError };
      }
      currentProjectId = newProject.id;
    }

    const dataToSave: any = {
      ...techniqueData,
      user_id: user.id,
      project_id: currentProjectId,
    };

    const existingId = dataToSave.id;
    // Clean up fields that shouldn't be in the 'remixed_techniques' table
    delete dataToSave.id;
    delete dataToSave.saved_results;

    if (existingId) {
      // Update existing remixed technique
      const { data, error } = await supabase
        .from("remixed_techniques")
        .update(dataToSave)
        .eq("id", existingId)
        .eq("user_id", user.id)
        .select()
        .single(); // Use single() because we expect one result

      if (error) throw error;
      return { data, error: null };
    } else {
      // Insert new remixed technique
      const { data, error } = await supabase
        .from("remixed_techniques")
        .insert(dataToSave)
        .select()
        .single(); // Use single() because we expect one result

      if (error) throw error;
      return { data, error: null };
    }
  } catch (error: any) {
    console.error("Error in saveOrUpdateRemixedTechnique:", error);
    return { data: null, error };
  }
}


export async function fetchRemixedTechniqueById(id: string): Promise<{ data: RemixedTechnique | null; error: PostgrestError | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

    const { data, error } = await supabase
        .from('remixed_techniques')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (error) console.error("Error fetching remixed technique by ID:", error);
    return { data, error };
}

export async function fetchAllRemixedTechniquesForUser(): Promise<{ data: RemixedTechnique[] | null; error: PostgrestError | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

    const { data, error } = await supabase
        .from('remixed_techniques')
        .select(`
            *,
            saved_results (
                project_name
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) console.error("Error fetching all remixed techniques for user:", error);
    return { data, error };
}

export async function fetchRemixedTechniquesByProjectId(projectId: string): Promise<{ data: RemixedTechnique[] | null; error: PostgrestError | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated', details: '', hint: '', code: '401', name: '' } };

    const { data, error } = await supabase
        .from('remixed_techniques')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

    if (error) console.error("Error fetching remixed techniques by project ID:", error);
    return { data, error };
}

    