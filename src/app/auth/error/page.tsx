'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  
  // Common OAuth errors and their user-friendly messages
  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The sign in link is no longer valid.',
    Default: 'An error occurred while signing in.',
  };

  const errorMessage = error ? errorMessages[error as keyof typeof errorMessages] || errorMessages.Default : errorMessages.Default;

  useEffect(() => {
    console.error('Authentication error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            {errorMessage}
          </p>
          {error && (
            <div className="mt-4 rounded-md bg-muted p-4 text-left">
              <p className="text-sm font-medium">Error details:</p>
              <code className="mt-1 block overflow-x-auto rounded bg-muted p-2 text-xs">
                {error}
              </code>
            </div>
          )}
        </div>
        
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Back to Sign In
            </Link>
          </Button>
          
          <p className="mt-4 text-sm text-muted-foreground">
            Need help?{' '}
            <a 
              href="mailto:support@studymart.com" 
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
