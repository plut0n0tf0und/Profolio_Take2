
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function SignupErrorHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        title: 'Sign Up Failed',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
      // Clean the URL so the toast won’t repeat on refresh
      const newPath = window.location.pathname;
      window.history.replaceState({}, '', newPath);
    }
  }, [searchParams, router, toast]);

  return null; // This component doesn't render anything
}
