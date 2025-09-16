
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { GithubIcon, GoogleIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { PasswordStrengthInput } from './password-strength-input';
import { supabase } from '@/lib/supabaseClient';
import { ForgotPasswordDialog } from './forgot-password-dialog';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long.' }),
});

interface AuthFormProps {
    mode: 'login' | 'signup';
}

async function getProviderUrl(provider: 'google' | 'github', redirectTo: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Important: this tells Supabase to return the URL instead of redirecting
      skipBrowserRedirect: true, 
    },
  });

  if (error) {
    console.error('Error getting provider URL:', error);
    return null;
  }
  return data.url;
}


export function AuthForm({ mode }: AuthFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSocialLoginPending, setSocialLoginPending] = useState<string | null>(
    null
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema | typeof signUpSchema>>({
    resolver: zodResolver(mode === 'login' ? loginSchema : signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: z.infer<typeof loginSchema | typeof signUpSchema>) => {
    startTransition(async () => {
        if (mode === 'signup') {
            const { error } = await supabase.auth.signUp(values);
            if (error) {
                toast({
                  title: 'Sign Up Failed',
                  description: error.message || 'An unexpected error occurred.',
                  className: 'px-3 py-2 text-sm border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-lg shadow-md',
                });
            } else {
                toast({
                  title: 'Welcome!',
                  description: 'You have successfully signed up. Redirecting...',
                });
                router.push('/dashboard');
                router.refresh();
            }
        } else { // login
            const { error } = await supabase.auth.signInWithPassword(values);
            if (error) {
                toast({
                  title: 'Login Failed',
                  description: error.message || 'Invalid email or password.',
                  className: 'px-3 py-2 text-sm border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-lg shadow-md',
                });
              } else {
                router.push('/dashboard');
                router.refresh();
              }
        }
    });
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoginPending(provider);
  
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback${mode === 'login' ? '?is_login=true' : ''}`,
          skipBrowserRedirect: true, // stop auto redirect so we can handle toast first
        },
      });
  
      if (error) {
        toast({
          title: 'Authentication Failed',
          description: error.message || `Failed to sign in with ${provider}.`,
          className: 'px-3 py-2 text-sm border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-lg shadow-md',
        });
        setSocialLoginPending(null);
        return;
      }
  
      if (data?.url) {
        window.location.href = data.url; // now manually redirect
      }
    } catch (err) {
      toast({
        title: 'Authentication Failed',
        description: 'Unexpected error occurred.',
        className: 'px-3 py-2 text-sm border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-lg shadow-md',
      });
      setSocialLoginPending(null);
    }
  };
  
  
  

  return (
    <>
    <Card className="w-full border-0 bg-transparent shadow-none">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4 px-0">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    mode === 'login' ? (
                      <FormItem>
                          <div className="flex items-center">
                          <FormLabel>Password</FormLabel>
                          <Button 
                            type="button" 
                            variant="link" 
                            onClick={() => setShowForgotPassword(true)}
                            className="ml-auto h-auto p-0 text-sm font-normal text-primary hover:underline">
                            Forgot password?
                          </Button>
                        </div>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    ) : (
                        <PasswordStrengthInput field={field} />
                    )
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4 px-0">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mode === 'login' ? 'Log In' : 'Create Account'}
                </Button>
              </CardFooter>
            </form>
          </Form>
      
      <div className="relative py-4 px-0">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-black px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <CardFooter className="flex gap-4 px-0">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin('google')}
          disabled={!!isSocialLoginPending}
        >
          {isSocialLoginPending === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-5 w-5" />
          )}
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin('github')}
          disabled={!!isSocialLoginPending}
        >
          {isSocialLoginPending === 'github' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GithubIcon className="mr-2 h-5 w-5" />
          )}
          GitHub
        </Button>
      </CardFooter>
    </Card>
    <ForgotPasswordDialog open={showForgotPassword} onOpenChange={setShowForgotPassword} />
    </>
  );
}
