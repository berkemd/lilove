import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, User, Sparkles, Loader2 } from 'lucide-react';
import { SiGoogle, SiApple } from 'react-icons/si';
import appIconUrl from '@/assets/app-icon.png';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { Link, useLocation, useSearch } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Map OAuth error codes to user-friendly messages
function getOAuthErrorMessage(errorCode: string, message: string | null, t: (key: string) => string): string {
  const errorMessages: Record<string, string> = {
    'oauth_failed': t('auth.oauthFailed'),
    'invalid_state': t('auth.invalidState'),
    'no_code': t('auth.noAuthCode'),
    'login_failed': t('auth.loginFailed'),
    'session_save_failed': t('auth.sessionSaveFailed'),
    'apple_not_configured': t('auth.appleNotConfigured'),
    'google_not_configured': t('auth.googleNotConfigured'),
  };
  
  // If we have a specific message from the server, use it
  if (message && message !== errorCode) {
    return decodeURIComponent(message);
  }
  
  return errorMessages[errorCode] || t('auth.genericError');
}

export default function Auth() {
  const { 
    user,
    signIn, 
    signUp, 
    signInWithGoogle, 
    signInWithApple, 
    loading, 
    error: authError,
    clearError 
  } = useFirebaseAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    email: '',
    username: '',
    password: '',
    displayName: ''
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  // Handle OAuth error from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const error = params.get('error');
    const message = params.get('message');
    
    if (error) {
      const friendlyMessage = getOAuthErrorMessage(error, message, t);
      setOauthError(friendlyMessage);
      trackEvent('oauth_error', { error, message });
      
      // Clear URL params after reading
      window.history.replaceState({}, '', '/auth');
    }
  }, [searchString, t]);

  // Clear errors only on initial mount - using empty deps to avoid re-running on clearError reference changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    clearError();
    setLocalError('');
  }, []);

  const displayError = localError || authError || oauthError;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setOauthError(null);
    clearError();
    setIsSubmitting(true);

    try {
      await signIn(loginData.email, loginData.password);
      trackEvent('sign_in', { method: 'email' });
      
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.welcomeMessage'),
      });
    } catch (err: any) {
      const errorMessage = err.message || t('auth.genericError');
      setLocalError(errorMessage);
      toast({
        variant: 'destructive',
        title: t('auth.loginFailed'),
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      const errorMsg = t('auth.agreeToTermsError');
      setLocalError(errorMsg);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: errorMsg,
      });
      return;
    }

    setLocalError('');
    setOauthError(null);
    clearError();
    setIsSubmitting(true);

    try {
      const displayName = registerData.displayName || registerData.username;
      await signUp(registerData.email, registerData.password, displayName);
      trackEvent('sign_up', { method: 'email' });
      
      toast({
        title: t('auth.welcomeToLilove'),
        description: t('auth.journeyBegins'),
      });
    } catch (err: any) {
      const errorMessage = err.message || t('auth.genericError');
      setLocalError(errorMessage);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setOauthError(null);
    clearError();
    setIsSubmitting(true);
    trackEvent('sign_in_attempt', { method: 'google' });
    
    try {
      await signInWithGoogle();
      trackEvent('sign_in', { method: 'google' });
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.welcomeMessage'),
      });
    } catch (err: any) {
      console.error('[Google Sign-In] Error:', err);
      const errorMessage = err.message || 'An error occurred during sign-in';
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setLocalError(errorMessage);
        toast({
          variant: 'destructive',
          title: t('auth.loginFailed'),
          description: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLocalError('');
    setOauthError(null);
    clearError();
    setIsSubmitting(true);
    trackEvent('sign_in_attempt', { method: 'apple' });
    
    try {
      await signInWithApple();
      trackEvent('sign_in', { method: 'apple' });
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.welcomeMessage'),
      });
    } catch (err: any) {
      console.error('[Apple Sign-In] Error:', err);
      const errorMessage = err.message || 'An error occurred during sign-in';
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setLocalError(errorMessage);
        toast({
          variant: 'destructive',
          title: t('auth.loginFailed'),
          description: errorMessage,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/80 p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-24 h-24">
            <img src={appIconUrl} alt="LiLove" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">LiLove</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-tagline">
              {t('auth.tagline')}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="border-0 shadow-xl bg-card/50 backdrop-blur">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t('common.getStarted')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayError && (
              <Alert variant="destructive" data-testid="auth-error">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">{t('auth.signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder={t('auth.enterYourEmail')}
                        className="pl-9"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder={t('auth.enterYourPassword')}
                        className="pl-9"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        data-testid="input-login-password"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.signIn')
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t('auth.enterYourEmail')}
                        className="pl-9"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        data-testid="input-register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">{t('auth.username')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder={t('auth.chooseUsername')}
                        className="pl-9"
                        value={registerData.username}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                        required
                        data-testid="input-register-username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-displayName">{t('auth.displayName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-displayName"
                        type="text"
                        placeholder={t('auth.yourDisplayName')}
                        className="pl-9"
                        value={registerData.displayName}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, displayName: e.target.value }))}
                        data-testid="input-register-displayname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder={t('auth.createPassword')}
                        className="pl-9"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        data-testid="input-register-password"
                      />
                    </div>
                  </div>
                  
                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="terms-agreement"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      data-testid="checkbox-terms"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="terms-agreement"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        {t('auth.agreeToTerms').split('Terms of Service')[0]}
                        <Link href="/legal/terms" className="text-primary hover:underline" data-testid="link-terms">
                          {t('auth.termsOfService')}
                        </Link>
                        {' '}and{' '}
                        <Link href="/legal/privacy" className="text-primary hover:underline" data-testid="link-privacy">
                          {t('auth.privacyPolicy')}
                        </Link>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !agreedToTerms}
                    data-testid="button-register"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.creatingAccount')}
                      </>
                    ) : (
                      t('auth.createAccount')
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* OAuth Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t('auth.orContinueWith')}
                  </span>
                </div>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  data-testid="button-google-signin"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SiGoogle className="mr-2 h-4 w-4" />
                  )}
                  {t('auth.continueWithGoogle')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAppleSignIn}
                  disabled={isLoading}
                  data-testid="button-apple-signin"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SiApple className="mr-2 h-5 w-5" />
                  )}
                  {t('auth.continueWithApple')}
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>{t('auth.footer')}</p>
          <p className="text-xs">
            {t('auth.termsAgree').split('Terms')[0]}
            <Link href="/legal/terms" className="text-primary hover:underline">
              {t('auth.termsOfService')}
            </Link>
            {' '}and{' '}
            <Link href="/legal/privacy" className="text-primary hover:underline">
              {t('auth.privacyPolicy')}
            </Link>
          </p>
          <div className="flex justify-center pt-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
