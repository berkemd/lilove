import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { signInWithCustomToken } from '@/lib/firebase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(searchString);
      const token = params.get('token');
      const success = params.get('success');
      const provider = params.get('provider');
      const error = params.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(decodeURIComponent(params.get('message') || error));
        return;
      }

      if (success !== '1' || !token) {
        setStatus('error');
        setErrorMessage('Authentication failed. Please try again.');
        return;
      }

      try {
        console.log(`[AuthCallback] Signing in with ${provider} custom token...`);
        await signInWithCustomToken(token);
        console.log('[AuthCallback] Firebase sign-in successful');
        setStatus('success');
        
        setTimeout(() => {
          setLocation('/dashboard');
        }, 1000);
      } catch (err: any) {
        console.error('[AuthCallback] Firebase sign-in failed:', err);
        setStatus('error');
        setErrorMessage(err.message || 'Failed to complete sign-in');
      }
    };

    handleCallback();
  }, [searchString, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/80 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Completing sign-in...</h2>
              <p className="text-muted-foreground">Please wait while we set up your session.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
              <h2 className="text-xl font-semibold">Welcome to LiLove!</h2>
              <p className="text-muted-foreground">Redirecting you to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold">Sign-in Failed</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
              <Button 
                onClick={() => setLocation('/auth')}
                data-testid="button-retry-auth"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
