
'use client';

import { useRouter } from 'next/navigation';
import { supabase, getUserProfile } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, Settings, Moon, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from './ui/skeleton';
import { Logo } from './logo';
import { cn } from '@/lib/utils';


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function deriveNameFromEmail(email: string): string {
  const namePart = email.split('@')[0];
  return namePart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    
    async function loadProfile() {
      setIsLoading(true);
      const { user } = await getUserProfile();
      if (user) {
        setUserName(user.user_metadata?.full_name || deriveNameFromEmail(user.email || ''));
      }
      setIsLoading(false);
    }

    loadProfile();

  }, []);

  const toggleTheme = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navigateToSettings = () => {
    router.push('/settings');
    onClose();
  };

  return (
      <aside className={cn(
          "fixed top-0 left-0 z-40 w-[280px] h-screen bg-card border-r border-border flex-col transition-transform duration-300 ease-in-out md:flex",
          isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex-1 flex flex-col py-4">
            <div className="flex items-center gap-3 py-4 px-6">
                <UserCircle className="h-10 w-10 text-muted-foreground" />
                <div className="flex flex-col">
                    {isLoading ? (
                        <Skeleton className="h-5 w-32" />
                    ) : (
                        <span className="font-semibold">{userName || 'User'}</span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col px-4">
            <div className="flex-1 space-y-4">
                <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-lg"
                onClick={navigateToSettings}
                >
                <Settings className="h-5 w-5" />
                Settings
                </Button>

                <div className="flex items-center justify-between px-4 py-2">
                <Label htmlFor="dark-mode" className="flex items-center gap-3 text-lg">
                    <Moon className="h-5 w-5" />
                    Dark Mode
                </Label>
                <Switch
                    id="dark-mode"
                    checked={isDarkMode}
                    onCheckedChange={toggleTheme}
                />
                </div>
            </div>

            <div className="mt-auto">
                <Separator className="my-4" />
                <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-lg text-destructive hover:text-destructive"
                onClick={handleLogout}
                >
                <LogOut className="h-5 w-5" />
                Sign Out
                </Button>
            </div>
            </div>
        </div>
      </aside>
  );
}
