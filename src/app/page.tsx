
'use client';

import { AuthForm } from '@/components/auth-form';
import { AnimatedGrid } from '@/components/animated-grid';
import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/logo';
import { LoginErrorHandler } from '@/components/login-error-handler';

function LoginPageContent() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-black p-4">
      <Suspense>
        <LoginErrorHandler />
      </Suspense>
      <div className="grid w-full max-w-5xl grid-cols-1 md:grid-cols-2">
        <div className="flex w-full max-w-md flex-col justify-center gap-6 p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-4">
              <Logo className="h-10 w-10 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Profolio</h1>
            </div>
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-foreground sm:text-4xl">
                    Welcome Back
                </h2>
                <p className="mt-2 text-muted-foreground">
                    Enter your credentials to access your projects.
                </p>
            </div>
          
            <AuthForm mode="login" />

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
        </div>
        <div className="relative hidden h-full md:flex items-center justify-center p-8">
          <AnimatedGrid />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
