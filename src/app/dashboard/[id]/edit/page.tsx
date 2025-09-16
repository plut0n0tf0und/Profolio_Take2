
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchSavedResultById, updateSavedResult } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const editFormSchema = z.object({
  project_name: z.string().min(1, "Project name is required."),
  role: z.string().min(1, "Role is required."),
  problem_statement: z.string().min(1, "Problem statement is required."),
});

type EditFormData = z.infer<typeof editFormSchema>;

const EditPageSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/5" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/5" />
            <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/5" />
            <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
    </div>
);

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
  });

  useEffect(() => {
    if (!id) return;
    const getProjectDetails = async () => {
      setIsLoading(true);
      const { data, error } = await fetchSavedResultById(id);
      if (error || !data) {
        toast({ title: 'Error', description: 'Failed to load project details.' });
        router.push('/dashboard');
      } else {
        form.reset(data as any);
      }
      setIsLoading(false);
    };
    getProjectDetails();
  }, [id, form, router, toast]);

  const onSubmit = async (formData: EditFormData) => {
    setIsSaving(true);

    const { error } = await updateSavedResult(id, formData);

    if (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not update the project. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Project Updated!',
        description: 'Your changes have been saved successfully.',
      });
      router.push(`/dashboard/${id}`);
      router.refresh();
    }
    setIsSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden md:inline">Back</span>
        </Button>
        <h1 className="text-xl font-bold text-center flex-1 truncate">Edit Project</h1>
        <div className="w-20" />
      </header>

      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        {isLoading ? (
            <EditPageSkeleton />
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="project_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Your Role</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problem_statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Problem Statement</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </form>
        </Form>
        )}
      </main>
    </div>
  );
}
