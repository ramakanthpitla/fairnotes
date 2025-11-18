'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FcGoogle } from 'react-icons/fc';
import { signIn, useSession } from 'next-auth/react';

declare global {
  interface Window {
    google: any;
  }
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const redirectPath = '/';
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (error) {
      const normalized = String(error).toLowerCase();
      
      // Handle different types of OAuth errors
      if (normalized.includes('oauth') || normalized.includes('callback')) {
        setErrorMessage('Failed to sign in with the selected provider. Please try again.');
      } else if (normalized.includes('access_denied')) {
        setErrorMessage('Sign in was cancelled. Please try again if you want to continue.');
      } else {
        setErrorMessage('Authentication failed. Please try again.');
      }
      
      // Clear the error from URL to prevent showing it again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [error]);

  const { data: session } = useSession();
  
  useEffect(() => {
    // If user is already signed in, redirect to 
    if (session) {
      router.push(redirectPath);
    }
  }, [session, redirectPath, router]);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      // Let NextAuth manage state/cookies; use normal redirect flow
      await signIn('google', { callbackUrl: redirectPath });
    } catch (error) {
      console.error('Sign in error:', error);
      setErrorMessage('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-md">
        {(error || errorMessage) && (
          <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
            <p>{errorMessage || 'Failed to sign in. Please try again.'}</p>
            {error && <p className="mt-1 text-xs opacity-75">Error code: {error}</p>}
          </div>
        )}
        
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to access your account and continue learning
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                <FcGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </>
            )}
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
