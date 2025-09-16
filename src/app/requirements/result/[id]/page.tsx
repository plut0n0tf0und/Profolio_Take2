
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchRequirementById, Requirement, saveOrUpdateResult } from '@/lib/supabaseClient';
import { getFilteredTechniques } from '@/lib/uxTechniques';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type StageTechniques = { [key: string]: {name: string, slug: string}[] };

const FiveDProcess = ({ techniques, projectId }: { techniques: StageTechniques, projectId: string }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>5D Design Process</CardTitle>
        <CardDescription>Recommended UX techniques for your project.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={Object.keys(techniques)} className="w-full">
          {Object.entries(techniques).map(([stage, stageTechs]) => (
            <AccordionItem value={stage} key={stage}>
              <AccordionTrigger className="text-lg font-semibold">{stage}</AccordionTrigger>
              <AccordionContent>
                {stageTechs.length > 0 ? (
                  <div className="space-y-3 p-2">
                    {stageTechs.map(technique => (
                      <Card key={technique.name} className="bg-background/50 border-border/50 hover:border-primary/50 transition-all">
                        <CardContent className="flex items-center justify-between p-4">
                           <Link href={`/dashboard/technique/${technique.slug}?projectId=${projectId}`} className="font-medium cursor-pointer hover:underline">
                            {technique.name}
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="p-2 text-muted-foreground">No specific techniques recommended for this stage based on your selections.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

const RequirementDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
       <Skeleton className="h-8 w-3/4" />
       <Skeleton className="h-5 w-1/4" />
    </div>
     <div className="space-y-2">
       <Skeleton className="h-4 w-1/5" />
       <Skeleton className="h-4 w-1/5" />
       <Skeleton className="h-4 w-1/5" />
     </div>
     <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);

export default function ResultPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const requirementId = params.id as string;
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [stageTechniques, setStageTechniques] = useState<StageTechniques>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!requirementId) return;

    const getRequirementData = async () => {
      setIsLoading(true);
      const { data, error } = await fetchRequirementById(requirementId);

      if (error || !data) {
        console.error("Error fetching project requirement:", error);
        toast({
            title: 'Error Fetching Project',
            description: 'Could not retrieve project details. Redirecting to dashboard.',
            variant: 'destructive',
        });
        router.push('/dashboard');
        return;
      }
      
      setRequirement(data);
      const filteredTechniques = getFilteredTechniques(data);
      setStageTechniques(filteredTechniques);
      setIsLoading(false);
    };

    getRequirementData();
  }, [requirementId, router, toast]);
  
  const handleProceedToDashboard = async () => {
    if (!requirement) {
        toast({
            title: 'Project Data Not Loaded',
            description: 'Cannot save project. Please try again.',
            variant: 'destructive',
        });
        return;
    }
    
    setIsSaving(true);
    
    const { data: savedResultData, error: saveError } = await saveOrUpdateResult(requirement);

    if (saveError || !savedResultData?.id) {
       console.error("Error saving result:", saveError);
       toast({
          title: 'Save Failed',
          description: 'Could not create the project. Please go back and try again.',
          variant: 'destructive',
        });
       setIsSaving(false);
    } else {
       toast({
        title: 'Project Created!',
        description: 'Your new project is now available on your dashboard.',
      });
      router.push(`/dashboard/${savedResultData.id}`);
      router.refresh();
    }
  };


  const handleBackToEdit = () => {
    router.push(`/requirements?id=${requirementId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
       <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Back to Requirements</span>
              </Button>
              <Button variant="ghost" size="sm" className="hidden shrink-0 md:flex items-center gap-1">
                <ChevronLeft className="h-5 w-5" />
                Back
              </Button>
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Your Choices</AlertDialogTitle>
              <AlertDialogDescription>
                Edit your answers on the form to get new recommendations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBackToEdit}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <h1 className="truncate text-center text-xl font-bold md:flex-1">
          UX Recommendations
        </h1>

        <div className="flex items-center justify-end gap-2" style={{ minWidth: '80px' }}>
          <Button variant="default" size="sm" onClick={handleProceedToDashboard} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save as Project
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        <div className="space-y-8">
          {isLoading ? <RequirementDetailSkeleton /> : requirement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">{requirement.project_name}</CardTitle>
                <CardDescription>
                  {requirement.role} &middot; Created on {requirement.date ? format(new Date(requirement.date), 'PPP') : 'Date not available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Problem Statement</h4>
                  <p className="text-muted-foreground">{requirement.problem_statement || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                      <h4 className="font-semibold mb-2">Output Types</h4>
                      <div className="flex flex-wrap gap-2">
                         {requirement.output_type?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                  </div>
                  <div>
                      <h4 className="font-semibold mb-2">Outcomes</h4>
                      <div className="flex flex-wrap gap-2">
                         {requirement.outcome?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                  </div>
                  <div>
                      <h4 className="font-semibold mb-2">Device Types</h4>
                      <div className="flex flex-wrap gap-2">
                         {requirement.device_type?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                      </div>
                  </div>
                   <div>
                    <h4 className="font-semibold mb-2">Project Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {requirement.project_type && <Badge variant="secondary" className="capitalize">{requirement.project_type}</Badge>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Existing Users</h4>
                    <div className="flex flex-wrap gap-2">
                      {requirement.existing_users !== null && typeof requirement.existing_users !== 'undefined' && <Badge variant="secondary">{requirement.existing_users ? 'Yes' : 'No'}</Badge>}
                    </div>
                  </div>
               </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <RequirementDetailSkeleton />
          ) : (
            <FiveDProcess techniques={stageTechniques} projectId={requirementId} />
          )}
        </div>
      </main>
    </div>
  );
}

    