
'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          isSidebarOpen ? 'md:ml-[280px]' : 'ml-0'
      )}>
        {/* Floating Toggle Button for mobile */}
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "fixed top-4 left-4 z-50 h-9 w-9 transition-transform duration-300 ease-in-out md:hidden",
                isSidebarOpen && "translate-x-[280px]"
            )}
            onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
            {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
        
        {/* Toggle Button for desktop */}
        <div className="hidden md:block">
            <Button
                variant="outline"
                size="icon"
                className={cn(
                    "fixed top-1/4 -translate-y-1/2 z-20 h-24 w-8 rounded-r-full border-y-sidebar-border border-r-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isSidebarOpen ? 'left-[280px] border-l-0' : 'left-0 border-l-sidebar-border',
                    !isSidebarOpen && 'rounded-l-full'
                )}
                onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
                {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
        </div>

        {children}
      </div>
    </div>
  );
}
