
'use client';

import { useEffect, useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, FileText, FileUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchAllRemixedTechniquesForUser } from '@/lib/supabaseClient';
import { generateFullPortfolio, FullPortfolioOutput, EnrichedRemixedTechnique } from '@/ai/flows/generate-full-portfolio';
import { toPng } from 'html-to-image-fix';
import jsPDF from 'jspdf';

const PortfolioSkeleton = () => (
  <div className="space-y-8">
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is building your full portfolio...</p>
        <p className="text-sm text-center text-muted-foreground/80">
          This may take a moment. The AI is analyzing all your remixed techniques to create a
          professional summary.
        </p>
      </CardContent>
    </Card>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
    <div className="text-muted-foreground text-base leading-relaxed">{children}</div>
  </div>
);

export default function FullPortfolioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [portfolio, setPortfolio] = useState<FullPortfolioOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, startExportTransition] = useTransition();
  const portfolioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generate = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await fetchAllRemixedTechniquesForUser();
        if (error) {
          console.error("Error fetching remixed techniques:", error);
          toast({
            title: "Error Loading Data",
            description: "Could not fetch your saved work. Please try again.",
            variant: "destructive",
          });
          setPortfolio({ projects: [] }); // Empty state
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
            toast({
              title: "No Content",
              description: "You have not remixed any techniques yet. Remix a technique to see it here.",
              variant: "destructive",
            });
            setPortfolio({ projects: [] }); // Empty state
            setIsLoading(false);
            return;
        }

        const enrichedData: EnrichedRemixedTechnique[] = data.map((item) => ({
          ...item,
          project_name: (item.saved_results as any)?.project_name || "Standalone Work",
        }));

        const generatedPortfolio = await generateFullPortfolio(enrichedData);
        setPortfolio(generatedPortfolio);
      } catch (aiError: any) {
        console.error("AI Generation Error:", aiError);
        toast({
          title: "AI Error",
          description: `Failed to generate portfolio: ${aiError.message}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    generate();
  }, [toast]);

  const handleExport = () => {
    const content = portfolioRef.current;
    if (!content) {
        toast({ title: 'Error', description: 'Could not find portfolio content to export.' });
        return;
    }

    startExportTransition(async () => {
        try {
            const dataUrl = await toPng(content, { 
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#0A0A0A' : '#FFFFFF',
                width: content.offsetWidth,
                height: content.scrollHeight,
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const contentWidth = content.offsetWidth;
            const contentHeight = content.scrollHeight;
            const ratio = contentWidth / contentHeight;
            
            const imgWidth = pdfWidth;
            const imgHeight = imgWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
              heightLeft -= pdfHeight;
            }

            pdf.save('profolio-export.pdf');

            toast({
                title: 'Export Successful!',
                description: 'Your portfolio has been downloaded as a PDF.',
            });

        } catch (error) {
            console.error('Export Error:', error);
            toast({
                title: 'Export Failed',
                description: 'An error occurred while exporting your portfolio.',
                variant: 'destructive',
            });
        }
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden md:inline">Back</span>
        </Button>
        <h1 className="text-xl font-bold text-center flex-1 truncate">Full Portfolio</h1>
        <div className="w-auto flex justify-end gap-2">
            <Button onClick={handleExport} variant="outline" disabled={isLoading || isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Export
            </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        {isLoading ? (
          <PortfolioSkeleton />
        ) : portfolio && portfolio.projects.length > 0 ? (
          <div ref={portfolioRef} className="space-y-12 bg-background p-4">
            {portfolio.projects.map((project, projIndex) => (
              <Card key={projIndex} className="border-border/50 shadow-lg break-inside-avoid">
                <CardHeader>
                  <CardTitle className="text-4xl font-black">{project.projectName}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </CardDescription>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-sm text-muted-foreground">
                    <div>
                      <strong>Date:</strong> {project.meta.date || "N/A"}
                    </div>
                    <div>
                      <strong>Duration:</strong> {project.meta.duration || "N/A"}
                    </div>
                    <div>
                      <strong>Team Size:</strong> {project.meta.teamSize || "N/A"}
                    </div>
                    <div>
                      <strong>Role:</strong> {project.meta.role || "N/A"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <Separator />
                  <Section title="Why & Problem Statement">
                    <p>{project.whyAndProblem}</p>
                  </Section>
                  <Section title="Introduction">
                    <p>{project.introduction}</p>
                  </Section>
                  <Section title="Approach">
                     <ul className="list-disc list-outside pl-5 space-y-2">
                        {project.approach.map((item, i) => <li key={i}>{item}</li>)}
                     </ul>
                  </Section>
                   <Section title="Prerequisites">
                      <div className="space-y-4">
                        {project.prerequisites.map((item, i) => (
                          <div key={i} className="break-inside-avoid">
                            <h4 className="font-semibold">{item.technique}</h4>
                            <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
                              {item.bullets.map((bullet, j) => <li key={j}>{bullet}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                  </Section>
                  <Section title="Execution Steps">
                      <div className="space-y-4">
                        {project.executionSteps.map((item, i) => (
                          <div key={i} className="break-inside-avoid">
                            <h4 className="font-semibold">{item.technique}</h4>
                            <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
                              {item.bullets.map((bullet, j) => <li key={j}>{bullet}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                  </Section>
                  <Section title="Impact on Design">
                    <ul className="list-disc list-outside pl-5 space-y-2">
                        {project.impactOnDesign.map((item, i) => <li key={i}>{item}</li>)}
                     </ul>
                  </Section>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-4 rounded-lg border border-dashed p-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">No Portfolio Content</h2>
            <p className="text-muted-foreground">
              You haven't remixed any techniques yet. Once you remix a technique from a project, it
              will appear here.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </div>
        )}
      </main>
    </div>
  );
}
