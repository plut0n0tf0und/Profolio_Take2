
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { fetchSavedResults, Requirement } from '@/lib/supabaseClient';
import { ProjectCard } from '@/components/ProjectCard';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const motivationalTips = [
  'Your UX journey starts here ✦',
  'Good design is invisible ✦',
  'Simplicity is the ultimate sophistication ✦',
  'Empathize with your users ✦',
  'Fail faster to succeed sooner ✦',
];

const StaticPlaceholder = () => (
    <svg
      width="100"
      height="100"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto text-muted-foreground"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="5" rx="1" />
      <line x1="7" y1="16" x2="17" y2="16" />
      <line x1="7" y1="14" x2="12" y2="14" />
    </svg>
);


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tip, setTip] = useState('');
  const [projects, setProjects] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getTip = () => {
        setTip(motivationalTips[Math.floor(Math.random() * motivationalTips.length)]);
    }
    getTip();

    const loadProjects = async () => {
      setIsLoading(true);
      const { data, error } = await fetchSavedResults();
      if (error) {
        console.error("Failed to load projects:", error);
        toast({
            title: 'Failed to load projects',
            description: 'Could not fetch your saved projects. Please try again.',
            variant: 'destructive'
        });
      } else if (data) {
        setProjects(data);
      }
      setIsLoading(false);
    };

    loadProjects();
  }, [toast]);
  
  const filteredProjects = useMemo(() => {
    return projects.filter(project => 
        project.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-4">
            <Logo className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Profolio</h1>
        </div>
        <h1 className="text-xl font-bold hidden md:block absolute left-1/2 -translate-x-1/2">List of Projects</h1>
        <div className="flex items-center gap-2">
            <div className="relative flex items-center">
                <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Search projects..."
                    className={cn(
                        "h-9 w-48 rounded-full pl-4 pr-10 transition-all duration-300 ease-in-out",
                        isSearchOpen ? "w-48 scale-x-100 opacity-100" : "w-0 scale-x-0 opacity-0"
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => {
                        if (!searchTerm) setIsSearchOpen(false)
                    }}
                />
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={() => {
                        if (isSearchOpen && searchTerm) {
                            setSearchTerm('');
                        } else {
                            setIsSearchOpen(!isSearchOpen);
                        }
                    }}
                >
                    {isSearchOpen ? (
                        <X className="h-6 w-6 text-muted-foreground" />
                    ) : (
                        <Search className="h-5 w-5 text-muted-foreground" />
                    )}
                </Button>
            </div>
          <Link href="/requirements" passHref>
            <Button variant="ghost" size="icon">
              <Plus className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4">
        {isLoading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : projects.length > 0 ? (
            <div className="mx-auto max-w-4xl space-y-4">
                {filteredProjects.map((project) => (
                    <ProjectCard
                        key={project.id}
                        id={project.id!}
                        name={project.project_name || 'Untitled Project'}
                        tags={[...project.output_type || [], ...project.device_type || []]}
                        onClick={() => router.push(`/dashboard/${project.id}`)}
                    />
                ))}
                 {filteredProjects.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No projects found for &quot;{searchTerm}&quot;.</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="space-y-6">
                    <StaticPlaceholder />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">No Projects Yet</h2>
                        <p className="text-muted-foreground">Click the '+' icon to add your first project.</p>
                    </div>
                    {tip && (
                        <p className="text-sm text-muted-foreground">
                        {tip}
                        </p>
                    )}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
