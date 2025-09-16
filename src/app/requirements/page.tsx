
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { insertRequirement, fetchRequirementById, updateRequirement } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { CalendarIcon, Loader2, ChevronLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Define the base schema without any refinements.
const baseFormSchema = z.object({
  project_name: z.string().min(1, 'Project name is required.'),
  date: z.date(),
  problem_statement: z.string().min(1, 'Problem statement is required.'),
  role: z.string().min(1, 'Your role is required.'),
  output_type: z.array(z.string()),
  outcome: z.array(z.string()),
  device_type: z.array(z.string()),
  project_type: z.enum(['new', 'old']),
  existing_users: z.boolean(),
});

// Now create the final schema for the form by applying refinements.
const formSchema = baseFormSchema
  .refine((data) => data.output_type.length > 0, {
    message: 'You have to select at least one output type.',
    path: ['output_type'],
  })
  .refine((data) => data.outcome.length > 0, {
    message: 'You have to select at least one outcome.',
    path: ['outcome'],
  })
  .refine((data) => data.device_type.length > 0, {
    message: 'You have to select at least one device type.',
    path: ['device_type'],
  });


type FormSchemaType = z.infer<typeof formSchema>;

// Section schemas should pick from the unrefined base schema.
const sectionSchemas = [
  baseFormSchema.pick({ project_name: true, date: true, problem_statement: true, role: true }),
  baseFormSchema.pick({ output_type: true }),
  baseFormSchema.pick({ outcome: true }),
  baseFormSchema.pick({ device_type: true }),
  baseFormSchema.pick({ project_type: true }),
  baseFormSchema.pick({ existing_users: true }),
];

const outputTypes = [
    "Mobile App", "Web App", "Desktop Software", "Smartwatch Interface", "TV or Console Experience",
    "AR/VR Application", "Service Blueprint", "Journey Map", "Persona Profile", "Usability Report",
    "Design System", "Accessibility Audio", "KPI Dashboard/Analytics Report", "Storyboards",
    "Content Strategy", "Chatbot/Voice Interface", "Presentation", "Video", "Interactive Prototype",
    "UI Design", "Visual Design", "Motion Design", "Animation", "Voice Interaction", "Wireframe",
    "Information Architecture"
];
const outcomes = ['Qualitative', 'Quantitative', 'Insight'];
const deviceTypes = ['Mobile', 'Desktop', 'Electronics', 'Kiosk'];

const sections = [
    { index: 0, title: 'Basic Project Details' },
    { index: 1, title: 'Output Type' },
    { index: 2, title: 'Desired Outcome' },
    { index: 3, title: 'Device Type' },
    { index: 4, title: 'Project Type' },
    { index: 5, title: 'Existing Users' },
];

function RequirementsPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true });
  const [completedSections, setCompletedSections] = useState<Record<number, boolean>>({});
  const [savingSectionIndex, setSavingSectionIndex] = useState<number | null>(null);

  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_name: '',
      date: new Date(),
      problem_statement: '',
      role: '',
      output_type: [],
      outcome: [],
      device_type: [],
    },
  });

  useEffect(() => {
    const id = searchParams.get('id');
    setIsLoading(true);
    if (id) {
      setRequirementId(id);
      const loadRequirement = async () => {
        const { data, error } = await fetchRequirementById(id);
        if (error) {
          toast({ title: 'Failed to load project', description: 'Could not fetch existing project details.', variant: 'destructive' });
        } else if (data) {
          form.reset({
            ...data,
            date: data.date ? new Date(data.date) : new Date(),
            output_type: data.output_type || [],
            outcome: data.outcome || [],
            device_type: data.device_type || [],
            project_type: data.project_type as 'new' | 'old' | undefined,
            existing_users: data.existing_users,
          });
        }
        setIsLoading(false);
      };
      loadRequirement();
    } else {
      setIsLoading(false);
    }
  }, [searchParams, form, toast]);

  const handleSaveAndNext = async (currentSectionIndex: number) => {
    setSavingSectionIndex(currentSectionIndex);
    
    const currentSchema = sectionSchemas[currentSectionIndex];
    const fieldsToValidate = Object.keys(currentSchema.shape) as (keyof FormSchemaType)[];
    const isValid = await form.trigger(fieldsToValidate);

    if (!isValid) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields for this section.', variant: 'destructive' });
      setSavingSectionIndex(null);
      return;
    }

    const values = form.getValues();
    const dataToSave: any = { ...values };
    if (dataToSave.date && dataToSave.date instanceof Date) {
      dataToSave.date = dataToSave.date.toISOString();
    }
    
    try {
      let savedData;
      if (requirementId) {
        const { data, error } = await updateRequirement(requirementId, dataToSave);
        if (error) throw error;
        savedData = data;
      } else {
        const { data, error } = await insertRequirement(dataToSave as any);
        if (error) throw error;
        savedData = data;
        if (savedData?.id) {
          setRequirementId(savedData.id);
          const newUrl = `${window.location.pathname}?id=${savedData.id}`;
          window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
        }
      }

      setCompletedSections(prev => ({...prev, [currentSectionIndex]: true}));

      if (currentSectionIndex < sections.length - 1) {
        const nextSectionIndex = currentSectionIndex + 1;
        setExpandedSections(prev => ({ ...prev, [currentSectionIndex]: false, [nextSectionIndex]: true }));
        setTimeout(() => {
            sectionRefs.current[nextSectionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        const finalId = requirementId || savedData?.id;
        if (finalId) {
            router.push(`/requirements/result/${finalId}`);
        } else {
            throw new Error("Could not find requirement ID to show results.");
        }
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: 'Uh oh! Something went wrong.', description: error.message || 'There was a problem saving.', variant: 'destructive' });
    } finally {
      setSavingSectionIndex(null);
    }
  };

  const PageSkeleton = () => (
    <Card className="w-full">
        <CardHeader><Skeleton className="h-9 w-3/5" /><Skeleton className="h-4 w-4/5 mt-2" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></CardContent>
    </Card>
  );

  if (isLoading) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border bg-background px-4">
                <Button variant="ghost" size="icon" className="shrink-0" disabled><ChevronLeft className="h-6 w-6" /></Button>
                <h1 className="ml-2 text-xl ">Back</h1>
            </header>
            <main className="container mx-auto max-w-3xl flex-1 p-4 md:p-8"><PageSkeleton /></main>
        </div>
    );
  }

  const renderSectionContent = (sectionIndex: number) => {
    switch(sectionIndex) {
        case 0:
            return (
                <div className="space-y-4">
                    <FormField control={form.control} name="project_name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input placeholder="e.g., AuthNexus Redesign" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value instanceof Date ? field.value : new Date(field.value)} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="problem_statement" render={({ field }) => (<FormItem><FormLabel>Problem Statement</FormLabel><FormControl><Textarea placeholder="Describe the core problem your project aims to solve." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Your Role</FormLabel><FormControl><Input placeholder="e.g., UX Designer, Product Manager" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            );
        case 1:
            return (
                <FormField control={form.control} name="output_type" render={({ field }) => (<FormItem><div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">{outputTypes.map((item) => (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item));}} /></FormControl><FormLabel className="font-normal text-sm">{item}</FormLabel></FormItem>))}</div><FormMessage /></FormItem>)} />
            );
        case 2:
            return (
                <FormField control={form.control} name="outcome" render={({ field }) => (<FormItem><div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">{outcomes.map((item) => (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item));}} /></FormControl><FormLabel className="font-normal text-sm">{item}</FormLabel></FormItem>))}</div><FormMessage /></FormItem>)} />
            );
        case 3:
            return (
                 <FormField control={form.control} name="device_type" render={({ field }) => (<FormItem><div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">{deviceTypes.map((item) => (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item));}} /></FormControl><FormLabel className="font-normal text-sm">{item}</FormLabel></FormItem>))}</div><FormMessage /></FormItem>)} />
            );
        case 4:
            return (
                <FormField control={form.control} name="project_type" render={({ field }) => (
                    <FormItem><FormLabel>Is this a new or existing project?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-8 pt-2"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="new" /></FormControl><FormLabel className="font-normal text-sm">New Project</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="old" /></FormControl><FormLabel className="font-normal text-sm">Existing Project</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
            );
        case 5:
            return (
                <FormField control={form.control} name="existing_users" render={({ field }) => (
                    <FormItem><FormLabel>Does this project already have users?</FormLabel><FormControl><RadioGroup onValueChange={(value) => field.onChange(value === 'true')} value={String(field.value)} className="flex gap-8 pt-2"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal text-sm">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal text-sm">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
            );
        default: return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border bg-background px-4">
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" className='p-2'><ChevronLeft className="h-6 w-6" /><span className='ml-2'>Back</span></Button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle><AlertDialogDescription>Any unsaved changes will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => router.push('/dashboard')}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </header>
      <main className="container mx-auto max-w-3xl flex-1 p-4 md:p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl">Define Your Project</CardTitle>
          <CardDescription>Fill out the details below to get tailored UX recommendations. Save your progress at each step.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {sections.map((section) => (
                <Collapsible
                  key={section.index}
                  open={expandedSections[section.index]}
                  onOpenChange={(isOpen) => setExpandedSections(prev => ({...prev, [section.index]: isOpen}))}
                >
                  <Card ref={el => { sectionRefs.current[section.index] = el; }}>
                    <CardHeader>
                      <CollapsibleTrigger className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                          {completedSections[section.index] ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2", expandedSections[section.index] ? "border-primary" : "border-border")}>
                                {section.index + 1}
                            </div>
                          )}
                          <CardTitle className="text-xl">{section.title}</CardTitle>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", expandedSections[section.index] && "rotate-180")} />
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        {renderSectionContent(section.index)}
                        <Button onClick={() => handleSaveAndNext(section.index)} disabled={savingSectionIndex === section.index} className="w-full mt-6">
                            {savingSectionIndex === section.index ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : section.index === sections.length - 1 ? (
                                'Show Recommendations'
                            ) : (
                                'Save & Next'
                            )}
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </form>
          </Form>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}

export default function RequirementsPage() {
  return (
    <Suspense>
      <RequirementsPageContent />
    </Suspense>
  )
}

    