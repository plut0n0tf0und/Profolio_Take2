
'use client';

import { useEffect, useState, useMemo, useTransition, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toPng } from 'html-to-image-fix';
import { saveOrUpdateRemixedTechnique, fetchRemixedTechniqueById, RemixedTechnique, fetchSavedResultById } from '@/lib/supabaseClient';
import allTechniqueMetadata from '@/data/uxTechniqueDetails.json';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Check, Clipboard, ExternalLink, Wand2, PlusCircle, Trash2, Eye, Loader2, Save, Share2, CalendarIcon, CheckSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getTechniqueDetails, type TechniqueDetailsOutput } from '@/ai/flows/get-technique-details';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SectionCard = ({ title, children, action, noPadding }: { title: string, children: React.ReactNode, action?: React.ReactNode, noPadding?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-2xl">{title}</CardTitle>
      {action}
    </CardHeader>
    <CardContent className={noPadding ? 'p-0' : ''}>
      {children}
    </CardContent>
  </Card>
);

const techniqueRemixSchema = z.object({
  technique_name: z.string(),
  project_id: z.string().uuid().nullable(),
  date: z.union([z.date(), z.string()]),
  duration: z.string(),
  teamSize: z.string(),
  why: z.string(),
  overview: z.string(),
  problemStatement: z.string(),
  role: z.string(),
  prerequisites: z.array(z.object({
    id: z.string(),
    text: z.string(),
    checked: z.boolean(),
  })),
  executionSteps: z.array(z.object({
    id: z.string(),
    text: z.string(),
    checked: z.boolean(),
  })),
  attachments: z.object({
    files: z.array(z.object({
      id: z.string(),
      description: z.string(),
      value: z.any()
    })),
    links: z.array(z.object({
      id: z.string(),
      description: z.string(),
      value: z.string()
    })),
    notes: z.array(z.object({
      id: z.string(),
      value: z.string()
    })),
  }),
});


type TechniqueRemixData = z.infer<typeof techniqueRemixSchema>;

type FullTechniqueDetails = TechniqueDetailsOutput & { name: string; slug: string };

const TechniqueDetailsSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-10 w-24" />
    </div>
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-28 rounded-full" />
    </div>
    <Separator />
    {[...Array(5)].map((_, i) => (
      <div className="space-y-4" key={i}>
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    ))}
  </div>
);

const durationOptions = ["1 week", "2 weeks", "1 month", "3 months", "6 months", "Custom"];
const teamSizeOptions = ["Solo", "2–3", "4–6", "7–10", "11–15", "15+", "Custom"];

export default function TechniqueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const techniqueSlug = params.technique as string;
  const remixedTechniqueIdFromUrl = searchParams.get('remixId');
  const fromProjectId = searchParams.get('projectId');

  const [details, setDetails] = useState<FullTechniqueDetails | null>(null);
  const [remixedTechniqueId, setRemixedTechniqueId] = useState<string | null>(remixedTechniqueIdFromUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isBackAlertOpen, setIsBackAlertOpen] = useState(false);
  const [isSharing, startShareTransition] = useTransition();
  
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showCustomTeamSize, setShowCustomTeamSize] = useState(false);

  const shareableContentRef = useRef<HTMLDivElement>(null);
  const effectRan = useRef(false);

  const form = useForm<TechniqueRemixData>({
    resolver: zodResolver(techniqueRemixSchema),
    defaultValues: {
      technique_name: '',
      project_id: fromProjectId,
      date: new Date(),
      duration: '',
      teamSize: '',
      why: '',
      overview: '',
      problemStatement: '',
      role: '',
      prerequisites: [],
      executionSteps: [],
      attachments: {
        files: [],
        links: [],
        notes: [],
      },
    }
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && effectRan.current) {
        return;
    }
    effectRan.current = true;

    const loadAllData = async () => {
      console.debug(`[DEBUG] 1. useEffect triggered. Slug: ${techniqueSlug}`);
      if (!techniqueSlug) return;
      
      setIsLoading(true);
      
      const techniqueMetadata = allTechniqueMetadata.find(t => t.slug === techniqueSlug);
      
      if (!techniqueMetadata) {
        toast({ title: 'Error: Technique Not Found', variant: 'destructive' });
        router.push('/dashboard');
        return;
      }
      console.debug(`[DEBUG] 2. Matched metadata from JSON: ${techniqueMetadata.name}`);

      try {
        const aiGeneratedDetails = await getTechniqueDetails({ techniqueName: techniqueMetadata.name });
        console.debug("[DEBUG] 3. AI flow returned data.", Object.keys(aiGeneratedDetails));
        
        const fullDetails = {
          ...aiGeneratedDetails,
          name: techniqueMetadata.name,
          slug: techniqueMetadata.slug
        };
        
        setDetails(fullDetails);
        console.debug("[DEBUG] 4. `details` state has been set.", fullDetails.name);

        if (remixedTechniqueIdFromUrl) {
          console.debug(`[DEBUG] 5a. Remix ID found: ${remixedTechniqueIdFromUrl}, fetching data...`);
          const { data: remixedData } = await fetchRemixedTechniqueById(remixedTechniqueIdFromUrl);
          if (remixedData) {
            const formData = {
              ...remixedData,
              date: remixedData.date ? new Date(remixedData.date) : new Date(),
            };
            form.reset(formData as any);

            if (formData.duration && !durationOptions.includes(formData.duration)) {
                setShowCustomDuration(true);
            }
             if (formData.teamSize && !teamSizeOptions.includes(formData.teamSize)) {
                setShowCustomTeamSize(true);
            }
            console.debug("[DEBUG] 5b. Successfully reset form with user's saved data.");
          }
        } else {
            console.debug(`[DEBUG] 5a. No remix ID, setting default form values from AI content.`);
            let projectProblemStatement = '';
            let projectRole = '';

            if (fromProjectId) {
                const { data: projectData } = await fetchSavedResultById(fromProjectId);
                if (projectData) {
                    projectProblemStatement = projectData.problem_statement || '';
                    projectRole = projectData.role || '';
                }
            }

            form.reset({
                technique_name: fullDetails.name,
                project_id: fromProjectId,
                overview: fullDetails.overview || '',
                prerequisites: (fullDetails.prerequisites || []).map((p, i) => ({ id: `prereq-${i}`, text: p, checked: false })),
                executionSteps: (fullDetails.executionSteps || []).map(s => ({ id: `step-${s.step}`, text: `${s.title}: ${s.description}`, checked: false })),
                date: new Date(),
                duration: '',
                teamSize: '',
                why: '',
                problemStatement: projectProblemStatement,
                role: projectRole,
                attachments: { files: [], links: [], notes: [] },
            });
        }
      } catch (error) {
        console.error("Failed to get technique details from AI:", error);
        toast({ title: "Error Loading Content", description: "Could not fetch details for this technique.", variant: 'destructive' });
      } finally {
        setIsLoading(false);
        console.debug("[DEBUG] 6. All data loading finished.");
      }
    };

    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techniqueSlug, remixedTechniqueIdFromUrl]);
  
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditMode(true);
    }
  }, [searchParams]);

  const { fields: prereqFields, append: appendPrereq, remove: removePrereq } = useFieldArray({
    control: form.control,
    name: "prerequisites",
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control: form.control,
    name: "executionSteps",
  });

  const { fields: fileFields, append: appendFile, remove: removeFile } = useFieldArray({
    control: form.control,
    name: "attachments.files",
  });
  
  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control: form.control,
    name: "attachments.links",
  });

  const { fields: noteFields, append: appendNote, remove: removeNote } = useFieldArray({
    control: form.control,
    name: "attachments.notes",
  });

  const techniqueName = useMemo(() => details?.name || '', [details]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
      description: 'Execution steps have been copied.',
    });
  };
  
  const performNavigation = () => {
    if (fromProjectId) {
      router.push(`/dashboard/${fromProjectId}`);
    } else {
      router.back();
    }
  };

  const handleDiscard = () => {
    setIsEditMode(false);
    setIsBackAlertOpen(false);
    if (!remixedTechniqueId) {
        router.replace(`/dashboard/technique/${techniqueSlug}${fromProjectId ? `?projectId=${fromProjectId}`: ''}`);
    }
  };

  const handleBackNavigation = () => {
    if (isEditMode && form.formState.isDirty) {
      setIsBackAlertOpen(true);
    } else {
      performNavigation();
    }
  };
  
  const handleShare = () => {
    if (!shareableContentRef.current) return;
    startShareTransition(async () => {
        try {
            const dataUrl = await toPng(shareableContentRef.current!, { 
                cacheBust: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#171717' : '#ffffff',
                pixelRatio: 2,
            });
            const link = document.createElement('a');
            link.download = `${techniqueSlug}-description.png`;
            link.href = dataUrl;
            link.click();
            toast({ title: 'Image downloaded!', description: 'Your technique description has been saved as a PNG.' });
        } catch (err) {
            console.error('Failed to create image', err);
            toast({ title: 'Error', description: 'Could not generate image for sharing.', variant: 'destructive' });
        }
    });
  };

  const allStepsText = useMemo(() => {
    if (!details?.executionSteps) return '';
    return details.executionSteps.map(s => `${s.step}. ${s.title}: ${s.description}`).join('\n');
  }, [details]);
  
  const onSaveAndPreview = (data: TechniqueRemixData) => {
    startSaveTransition(async () => {
      // Convert date to ISO string for Supabase
      const payloadToSave = {
        ...data,
        date: data.date instanceof Date ? data.date.toISOString() : data.date,
        id: remixedTechniqueId ?? undefined,
      };

      const { data: savedData, error } = await saveOrUpdateRemixedTechnique(payloadToSave);
  
      if (error || !savedData?.id) {
        console.error("Save failed:", error);
        toast({
          title: 'Save Failed',
          description: error?.message || 'Could not save the remixed technique. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Changes Saved!',
          description: 'Taking you to the preview...',
        });
  
        setRemixedTechniqueId(savedData.id);
  
        const newUrl = `${window.location.pathname}?edit=true&remixId=${savedData.id}${savedData.project_id ? `&projectId=${savedData.project_id}` : ''}`;
        if (window.location.href !== newUrl) {
            router.replace(newUrl);
        }
        
        // Reset form with potentially new data, ensuring date is a Date object
        form.reset({
          ...savedData,
          date: savedData.date ? new Date(savedData.date) : new Date(),
        } as any);

        router.push(`/dashboard/portfolio/${savedData.id}`);
      }
    });
  };

  const renderReadOnlyView = () => {
    console.debug(`[DEBUG] renderReadOnlyView called. \`details\` is ${details ? 'populated' : 'null'}.`);
    if (!details) return <TechniqueDetailsSkeleton />; // Fallback just in case
    
    return (
    <div className="space-y-8" ref={shareableContentRef}>
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle className="text-3xl font-bold">{details.name}</CardTitle>
                {details.bestFor && details.bestFor.length > 0 && (
                    <CardDescription className="flex flex-wrap gap-2 pt-2">
                        {details.bestFor.slice(0, 3).map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {details.overview && (
                    <p className="text-lg text-muted-foreground">{details.overview}</p>
                )}
            </CardContent>
        </Card>

        {details.prerequisites && details.prerequisites.length > 0 && (
            <SectionCard title="Prerequisites">
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                    {details.prerequisites.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </SectionCard>
        )}

        {details.executionSteps && details.executionSteps.length > 0 && (
            <SectionCard title="Execution Steps" action={
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(allStepsText)}>
                    <Clipboard className="mr-2 h-4 w-4" />
                    Copy Steps
                </Button>
            }>
                <div className="space-y-4">
                    {details.executionSteps.map(step => (
                        <div key={step.step} className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg flex-shrink-0">
                                {step.step}
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-lg">{step.title}</p>
                                <p className="text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>
        )}

        {details.resourceLinks && (details.resourceLinks.create?.length > 0 || details.resourceLinks.guides?.length > 0) && (
            <SectionCard title="Resource Links">
                <div className="grid gap-6">
                    {details.resourceLinks.create?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Ready-to-use</h4>
                            <div className="space-y-2">
                                {details.resourceLinks.create.map(link => (
                                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                        <ExternalLink className="h-4 w-4" />
                                        <span>{link.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    {details.resourceLinks.guides?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg mb-2">Best Practices / Guides</h4>
                            <div className="space-y-2">
                                {details.resourceLinks.guides.map(link => (
                                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                        <ExternalLink className="h-4 w-4" />
                                        <span>{link.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>
        )}

        <div className="grid md:grid-cols-2 gap-8">
            {details.effortAndTiming && (
                <SectionCard title="Effort & Timing">
                    <p className="text-muted-foreground">{details.effortAndTiming}</p>
                </SectionCard>
            )}
            {details.bestFor && details.bestFor.length > 0 && (
                <SectionCard title="Best For">
                    <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                        {details.bestFor.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </SectionCard>
            )}
        </div>

        {details.tips && details.tips.length > 0 && (
            <SectionCard title="Tips for Success">
                <ul className="space-y-3">
                    {details.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span className="text-muted-foreground">{tip}</span>
                        </li>
                    ))}
                </ul>
            </SectionCard>
        )}
    </div>
)};


  const ChecklistSection = ({
    fieldArray,
    control,
    name,
    append,
    remove,
    title,
  }: {
    fieldArray: any;
    control: any;
    name: 'prerequisites' | 'executionSteps';
    append: (val: any) => void;
    remove: (indices: number[] | number) => void;
    title: string;
  }) => {
    const watchedItems = form.watch(name);
    const selectedIndices = useMemo(() =>
        watchedItems
            .map((item, index) => (item.checked ? index : -1))
            .filter(index => index !== -1),
        [watchedItems]
    );

    const handleSelectAll = (checked: boolean) => {
      watchedItems.forEach((_, index) => {
        form.setValue(`${name}.${index}.checked`, checked, { shouldDirty: true });
      });
    };
  
    const handleDeleteSelected = () => {
        const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
        remove(sortedIndices);
    };

    const isAllSelected = watchedItems.length > 0 && selectedIndices.length === watchedItems.length;
    const showActions = selectedIndices.length > 0;
  
    const AddButton = (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ id: `${name}-${Date.now()}`, text: '', checked: false })}
        >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
    );

    const ActionsToolbar = (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <Checkbox id={`select-all-${name}`} onCheckedChange={handleSelectAll} checked={isAllSelected}/>
            <Label htmlFor={`select-all-${name}`} className="text-sm font-medium whitespace-nowrap">
                Select All
            </Label>
        </div>
        <Button
          type="button"
          variant="destructive-outline"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={watchedItems.length > 0 && selectedIndices.length === watchedItems.length}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete ({selectedIndices.length})
        </Button>
      </div>
    );
  
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between min-h-[64px] overflow-hidden">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <div className="relative h-9 min-w-[220px]">
              <div className={cn("absolute inset-0 transition-opacity duration-200 flex items-center justify-end", !showActions ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  {AddButton}
              </div>
              <div className={cn("absolute inset-0 transition-opacity duration-200 flex items-center justify-end", showActions ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  {ActionsToolbar}
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fieldArray.map((field: any, index: number) => (
              <div
                key={field.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 border-input bg-transparent px-3 transition-colors has-[:focus]:border-ring',
                  form.getValues(`${name}.${index}.checked`) && 'border-primary'
                )}
              >
                <FormField
                  control={control}
                  name={`${name}.${index}.checked`}
                  render={({ field: checkboxField }) => (
                    <FormItem className="flex items-center">
                      <FormControl>
                        <Checkbox
                          checked={checkboxField.value}
                          onCheckedChange={checkboxField.onChange}
                          className="h-5 w-5"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Input
                  {...form.register(`${name}.${index}.text`)}
                  placeholder="New item..."
                  className="h-auto flex-1 border-0 bg-transparent p-0 py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };


  const renderEditView = () => (
    <FormProvider {...form}>
    <form onSubmit={form.handleSubmit(onSaveAndPreview)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Technique Details</CardTitle>
          <CardDescription>Basic information about this remixed technique instance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value instanceof Date ? field.value : new Date(field.value)}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                     {showCustomDuration ? (
                        <FormControl>
                            <Input 
                                placeholder="Enter custom duration" 
                                {...field} 
                                onBlur={() => {
                                    if (!field.value) setShowCustomDuration(false);
                                }}
                                autoFocus
                            />
                        </FormControl>
                     ) : (
                         <Select
                            onValueChange={(value) => {
                              if (value === 'Custom') {
                                setShowCustomDuration(true);
                                field.onChange('');
                              } else {
                                field.onChange(value);
                              }
                            }}
                            value={field.value}
                         >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a duration" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {durationOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                            </SelectContent>
                         </Select>
                     )}
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
                control={form.control}
                name="teamSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Size</FormLabel>
                     {showCustomTeamSize ? (
                        <FormControl>
                            <Input 
                                placeholder="Enter custom team size" 
                                {...field}
                                onBlur={() => {
                                    if (!field.value) setShowCustomTeamSize(false);
                                }}
                                autoFocus
                            />
                        </FormControl>
                     ) : (
                         <Select
                            onValueChange={(value) => {
                              if (value === 'Custom') {
                                setShowCustomTeamSize(true);
                                field.onChange('');
                              } else {
                                field.onChange(value);
                              }
                            }}
                            value={field.value}
                         >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select team size" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {teamSizeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                            </SelectContent>
                         </Select>
                     )}
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
                    
          <FormField control={form.control} name="why" render={({ field }) => ( <FormItem><FormLabel>Why This Technique?</FormLabel><Textarea placeholder="Explain why this technique was chosen for this problem." {...field} /></FormItem> )} />
          <FormField control={form.control} name="overview" render={({ field }) => ( <FormItem><FormLabel>Overview</FormLabel><Textarea placeholder="A brief overview of your plan." {...field} /></FormItem> )} />
        </CardContent>
      </Card>

      <ChecklistSection
        title="Prerequisites"
        fieldArray={prereqFields}
        control={form.control}
        name="prerequisites"
        append={appendPrereq}
        remove={removePrereq}
      />
      
      <ChecklistSection
        title="Execution Steps"
        fieldArray={stepFields}
        control={form.control}
        name="executionSteps"
        append={appendStep}
        remove={removeStep}
      />


      <Card>
        <CardHeader>
            <CardTitle>References &amp; Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <FormLabel>Files (Images, PDFs)</FormLabel>
                <div className="mt-2 space-y-2">
                    {fileFields.map((field, index) => (
                        <div key={field.id} className="flex flex-col sm:flex-row items-center gap-2">
                            <Input {...form.register(`attachments.files.${index}.description`)} placeholder="File description..." className="flex-1"/>
                            <Input type="file" {...form.register(`attachments.files.${index}.value`)} className="flex-1"/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendFile({ id: `file-${Date.now()}`, description: '', value: null })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add File
                </Button>
            </div>
            
            <div>
                <FormLabel>Links</FormLabel>
                <div className="mt-2 space-y-2">
                    {linkFields.map((field, index) => (
                        <div key={field.id} className="flex flex-col sm:flex-row items-center gap-2">
                            <Input {...form.register(`attachments.links.${index}.description`)} placeholder="Link description..." className="flex-1"/>
                            <Input {...form.register(`attachments.links.${index}.value`)} placeholder="https://example.com" className="flex-1"/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendLink({ id: `link-${Date.now()}`, description: '', value: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Link
                </Button>
            </div>

            <div>
                <FormLabel>Text Notes</FormLabel>
                <div className="mt-2 space-y-2">
                    {noteFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                            <Textarea {...form.register(`attachments.notes.${index}.value`)} placeholder="Paste or type notes here..." className="flex-1"/>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeNote(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
                 <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendNote({ id: `note-${Date.now()}`, value: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Note
                </Button>
            </div>
        </CardContent>
      </Card>
      
    </form>
    </FormProvider>
  );

  return (
    <>
    <AlertDialog open={isBackAlertOpen} onOpenChange={setIsBackAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to leave? Your changes will be discarded.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscard}>
                    Discard
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden md:inline">Cancel</span>
        </Button>
        <h1 className="text-xl font-bold text-center flex-1 truncate px-4">
          {isEditMode ? `Remix: ${techniqueName}` : techniqueName}
        </h1>
        <div className="w-auto flex justify-end gap-2" style={{minWidth: '150px'}}>
          {!isEditMode ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing}>
                  {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                  Share
              </Button>
            </div>
          ) : (
             <Button 
                onClick={form.handleSubmit(onSaveAndPreview)}
                disabled={isSaving}
              >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save & Preview'}
              </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        {isLoading ? (
            <TechniqueDetailsSkeleton />
        ) : (
            isEditMode ? renderEditView() : renderReadOnlyView()
        )}
      </main>
    </div>
    </>
  );
}
