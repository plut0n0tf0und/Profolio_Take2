
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  User,
  Mail,
  Lock,
  Trash2,
  Building,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, updateUserProfile, deleteUserAccount } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const { user, error } = await getUserProfile();
      if (error || !user) {
        toast({
          title: 'Error',
          description: 'Could not load user profile.',
          variant: 'destructive',
        });
        router.push('/dashboard');
        return;
      }
      setName(user.user_metadata?.full_name || '');
      setRole(user.user_metadata?.role || '');
      setCompany(user.user_metadata?.company || '');
      setEmail(user.email || '');
      setIsLoading(false);
    }
    loadProfile();
  }, [router, toast]);

  const handleSaveChanges = async () => {
    startSaveTransition(async () => {
      const { error } = await updateUserProfile({
        full_name: name,
        role,
        company,
      });

      if (error) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Could not update your profile.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
        router.refresh();
      }
    });
  };

  const handleDeleteAccount = () => {
    startDeleteTransition(async () => {
      const { error } = await deleteUserAccount();

      if (error) {
        toast({
          title: 'Deletion Failed',
          description: error.message || 'Could not delete your account. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Deleted',
          description: 'Your account has been permanently deleted.',
        });
        // Log out and redirect to home page
        router.push('/');
        router.refresh(); // Ensure the layout re-renders and user is logged out
      }
    });
  };

  const SettingsSkeleton = () => (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Edit Profile</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="mt-6 h-10 w-full" />
      </section>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
        <h1 className="ml-4 text-xl font-bold">Settings</h1>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {isLoading ? <SettingsSkeleton /> : (
            <>
            <section>
              <h2 className="text-lg font-semibold">Edit Profile</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <div className="relative mt-1">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <div className="relative mt-1">
                    <Building className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </div>
              <Button className="mt-6 w-full" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </section>

            <Separator />

            <section>
              <h2 className="text-lg font-semibold">Account Security</h2>
              <div className="mt-4 space-y-4">
                 <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative mt-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" value={email} disabled className="pl-10" />
                    </div>
                </div>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <span>Change Password</span>
                </Button>
              </div>
            </section>
            </>
          )}

          <Separator />

          {/* Delete Account Section */}
          <section>
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4 w-full justify-start gap-3">
                  <Trash2 className="h-5 w-5" />
                  <span>Delete Account</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continue'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </main>
    </div>
  );
}
