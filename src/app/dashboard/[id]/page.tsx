
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchSavedResultById, deleteSavedResult, Requirement } from '@/lib/supabaseClient';
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
import { ChevronLeft, Edit, Wand2, Loader2, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

type StageTechniques = { [key: string]: {name: string, slug: string}[] };

const FiveDProcess = ({ techniques, projectId }: { techniques: StageTechniques, projectId: string }) => {
  if (!techniques || Object.keys(techniques).length === 0) {
    return <p className="text-muted-foreground">No techniques to display.</p>;
  }
  return (
    <Card className="w-full border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle>5D Design Process</CardTitle>
        <CardDescription>Recommended UX techniques for your project.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={Object.keys(techniques)} className="w-full">
          {Object.entries(techniques).map(([stage, stageTechs]) => (
            <AccordionItem value={stage} key={stage}>
              <AccordionTrigger className="text-xl font-bold">{stage}</AccordionTrigger>
              <AccordionContent>
                {stageTechs.length > 0 ? (
                  <div className="space-y-3 p-2">
                    {stageTechs.map(technique => {
                      return (
                        <Card key={technique.name} className="bg-background/50 border-border/50 hover:border-primary/50 transition-all">
                          <CardContent className="flex items-center justify-between p-4">
                             <Link href={`/dashboard/technique/${technique.slug}?projectId=${projectId}`} className="font-medium cursor-pointer hover:underline">
                              {technique.name}
                            </Link>
                            <Link href={`/dashboard/technique/${technique.slug}?edit=true&projectId=${projectId}`} passHref>
                                <Button variant="outline" size="sm">
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Remix
                                </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      )
                    })}
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

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;
  const [project, setProject] = useState<Requirement | null>(null);
  const [stageTechniques, setStageTechniques] = useState<StageTechniques>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const getProjectData = async () => {
      setIsLoading(true);
      
      const { data: projectData, error: projectError } = await fetchSavedResultById(id);

      if (projectError) {
        console.error("Error fetching project data:", projectError);
        toast({
            title: 'Error Fetching Project Data',
            description: projectError?.message || 'Could not retrieve project details.',
            variant: 'destructive',
        });
        router.push('/dashboard');
      } else if (projectData) {
        setProject(projectData as Requirement);
        const filteredTechniques = getFilteredTechniques(projectData as Requirement);
        setStageTechniques(filteredTechniques);
      }
      setIsLoading(false);
    };

    getProjectData();
  }, [id, router, toast]);

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    const { error } = await deleteSavedResult(id);
    if (error) {
      console.error("Error deleting project:", error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the project. Please try again.',
        variant: 'destructive',
      });
      setIsDeleting(false);
    } else {
      toast({
        title: 'Project Deleted',
        description: `"${project?.project_name}" has been permanently removed.`,
      });
      router.push('/dashboard');
      router.refresh();
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden md:inline">Back to Dashboard</span>
        </Button>
        <h1 className="text-xl font-bold text-center flex-1 truncate">
            UX Recommendations
        </h1>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/full-portfolio" passHref>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <Eye className="mr-2 h-4 w-4" />
                View Full Portfolio
              </Button>
            </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        <div className="space-y-8">
          {isLoading ? <RequirementDetailSkeleton /> : project && (
            <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl">{project.project_name}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/${id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>
                <CardDescription>
                  {project.role} &middot; Saved on {project.created_at ? format(new Date(project.created_at), 'PPP') : 'Date not available'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Problem Statement</h4>
                  <p className="text-muted-foreground">{project.problem_statement || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Output Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.output_type?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Outcomes</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.outcome?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Device Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.device_type?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                   <div>
                    <h4 className="font-semibold mb-2">Project Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.project_type && <Badge variant="secondary" className="capitalize">{project.project_type}</Badge>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Existing Users</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.existing_users !== null && typeof project.existing_users !== 'undefined' && <Badge variant="secondary">{project.existing_users ? 'Yes' : 'No'}</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FiveDProcess techniques={stageTechniques} projectId={id} />
            
            <Separator />
            
            <div className="flex justify-start">
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive-outline">
                          Delete this project
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This will permanently delete the project &quot;{project.project_name}&quot;. This action cannot be undone.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteProject} 
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

    