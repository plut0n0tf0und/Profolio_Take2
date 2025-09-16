
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchRemixedTechniqueById, RemixedTechnique } from '@/lib/supabaseClient';
import { generatePortfolio, PortfolioOutput } from '@/ai/flows/generate-portfolio';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChevronLeft, Download, Loader2, FileText, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import allTechniqueDetails from '@/data/uxTechniqueDetails.json';

const PortfolioSkeleton = () => (
    <div className="space-y-8">
        <div className="space-y-2">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/4" />
        </div>
        {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-1/5" />
                <Skeleton className="h-20 w-full" />
            </div>
        ))}
    </div>
);

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <div className="text-muted-foreground text-base leading-relaxed">{children}</div>
    </div>
);

export default function PortfolioPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const id = params.id as string;

    const [technique, setTechnique] = useState<RemixedTechnique | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!id) return;

        const getTechniqueAndGenerate = async () => {
            setIsLoading(true);
            const { data: techniqueData, error } = await fetchRemixedTechniqueById(id);
            if (error || !techniqueData) {
                console.error("Error loading remixed technique:", error);
                toast({ title: 'Error', description: 'Failed to load portfolio details.', variant: 'destructive' });
                router.push('/dashboard');
                return;
            }
            setTechnique(techniqueData);

            setIsGenerating(true);
            try {
                const generatedPortfolio = await generatePortfolio(techniqueData);
                setPortfolio(generatedPortfolio);
            } catch (aiError) {
                console.error("AI Generation Error:", aiError);
                toast({ title: 'AI Error', description: 'Failed to generate portfolio content.', variant: 'destructive' });
            } finally {
                setIsGenerating(false);
                setIsLoading(false);
            }
        };

        getTechniqueAndGenerate();
    }, [id, router, toast]);
    
    const handleExport = () => {
        toast({ title: 'Coming Soon!', description: 'PDF/PNG export functionality will be implemented soon.'});
    }

    const handleBackToEditor = () => {
        if (!technique) return;
        const techniqueDetails = allTechniqueDetails.find(t => t.name === technique.technique_name);
        if (!techniqueDetails) {
            toast({ title: 'Error', description: 'Could not find the original technique details to edit.' });
            return;
        }
        const techniqueSlug = techniqueDetails.slug;
        const projectIdQuery = technique.project_id ? `&projectId=${technique.project_id}` : '';
        router.push(`/dashboard/technique/${techniqueSlug}?edit=true&remixId=${id}${projectIdQuery}`);
    };

    const handleDone = () => {
        if (technique?.project_id) {
            router.refresh();
            router.push(`/dashboard/${technique.project_id}`);
        } else {
            router.refresh();
            router.push('/dashboard');
        }
    };


    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
                <Button variant="ghost" size="sm" onClick={handleBackToEditor} className="flex items-center gap-2">
                    <ChevronLeft className="h-5 w-5" />
                    <span className="hidden md:inline">Edit</span>
                </Button>
                <h1 className="text-xl font-bold text-center flex-1 truncate">
                    Portfolio Preview
                </h1>
                <div className="w-auto flex justify-end gap-2">
                    <Button onClick={handleExport} variant="ghost" disabled={isLoading || isGenerating}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                     <Button onClick={handleDone} disabled={isLoading || isGenerating}>
                        Done
                    </Button>
                </div>
            </header>

            <main className="container mx-auto max-w-4xl p-4 md:p-8">
                {isLoading ? (
                    <PortfolioSkeleton />
                ) : isGenerating ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">AI is generating your portfolio...</p>
                            <p className="text-sm text-center text-muted-foreground/80">This may take a moment. The AI is analyzing your inputs to create a professional summary.</p>
                        </CardContent>
                    </Card>
                ) : technique && portfolio ? (
                    <Card className="border-border/50 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-4xl font-black">{portfolio.title}</CardTitle>
                            <CardDescription className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                                {portfolio.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                            </CardDescription>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm text-muted-foreground">
                                <div><strong>Date:</strong> {portfolio.meta.date || 'N/A'}</div>
                                <div><strong>Duration:</strong> {portfolio.meta.duration || 'N/A'}</div>
                                <div><strong>Team Size:</strong> {portfolio.meta.teamSize || 'N/A'}</div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <Separator/>
                            <Section title="Why This Method?">
                                <p>{portfolio.why}</p>
                            </Section>
                            <Section title="Overview">
                                <p>{portfolio.overview}</p>
                            </Section>
                            <Section title="Problem Statement">
                                <p>{portfolio.problemStatement}</p>
                            </Section>
                            <Section title="My Role">
                                <ul className="list-disc list-outside pl-5 space-y-2">
                                  {portfolio.roleAndResponsibilities.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </Section>
                             <Section title="Prerequisites">
                                <ul className="list-disc list-outside pl-5 space-y-2">
                                    {portfolio.prerequisites.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </Section>
                            <Section title="Execution Steps">
                                <ol className="list-decimal list-outside pl-5 space-y-2">
                                    {portfolio.executionSteps.map((item, i) => (
                                       <li key={i}>{item}</li>
                                    ))}
                                </ol>
                            </Section>
                             <Section title="References & Attachments">
                                <div className="space-y-4">
                                    {technique.attachments?.files && technique.attachments.files.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-lg">Files</h4>
                                            <ul className="list-none space-y-2 pt-2">
                                                {technique.attachments.files.map(file => <li key={file.id}><FileText className="inline-block mr-2 h-4 w-4"/>{file.description || 'Attached file'}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {technique.attachments?.links && technique.attachments.links.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-lg">Links</h4>
                                            <ul className="list-none space-y-2 pt-2">
                                                {technique.attachments.links.map(link => (
                                                    <li key={link.id}>
                                                        <LinkIcon className="inline-block mr-2 h-4 w-4"/>
                                                        <a href={link.value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link.description || link.value}</a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {technique.attachments?.notes && technique.attachments.notes.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-lg">Notes</h4>
                                            <div className="space-y-2 pt-2">
                                                {technique.attachments.notes.map(note => (
                                                    <blockquote key={note.id} className="border-l-4 pl-4 italic">
                                                        {note.value}
                                                    </blockquote>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Section>
                            <Section title="Impact on Design">
                                <p>{portfolio.impactOnDesign}</p>
                            </Section>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center text-muted-foreground">
                        Could not display portfolio.
                    </div>
                )}
            </main>
        </div>
    );
}
