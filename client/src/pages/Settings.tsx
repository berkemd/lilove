import { useState, useEffect } from 'react';
import { getAuth, signOut as firebaseSignOut } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { trackEvent, setAnalyticsOptOut, getAnalyticsOptOutStatus, resetAnalytics } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  User,
  Bell,
  Target,
  Palette,
  Clock,
  Sparkles,
  LogOut,
  Save,
  Brain,
  Moon,
  Sun,
  Monitor,
  CreditCard,
  Crown,
  Coins,
  Receipt,
  Download,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  XCircle,
  Mail,
  Smartphone,
  Volume2,
  VolumeX,
  Calendar,
  Trophy,
  Users,
  Zap,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  FileText,
  Mic,
  MicOff,
  Settings as SettingsIcon,
  Loader2,
  Link as LinkIcon,
  Unlink as UnlinkIcon
} from 'lucide-react';
import { SiGoogle, SiApple } from 'react-icons/si';
import { AIPrivacySettings } from '@/components/settings/AIPrivacySettings';

interface UserPreferences {
  theme?: string;
  notificationsEnabled?: boolean;
  motivationalQuotes?: boolean;
  celebrationsEnabled?: boolean;
  timezone?: string;
  displayName?: string;
  username?: string;
  voicePreferences?: {
    model?: string;
    autoPlay?: boolean;
    speed?: number;
  };
}

interface ProfileData {
  learningStyle?: string;
  preferredPace?: string;
  difficultyPreference?: string;
  goalCategories?: string[];
  dailyTimeCommitment?: number;
  preferredCoachingStyle?: string;
}

async function getFirebaseToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
    return null;
  }
}

function ConsentManagementSection() {
  const { toast } = useToast();
  const [consents, setConsents] = useState({
    analytics: false,
    behavioral: false,
    marketing: false
  });
  const [consentInfo, setConsentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch current consent status
  const { data } = useQuery({
    queryKey: ['/api/consent'],
  });

  useEffect(() => {
    if (data) {
      setConsents({
        analytics: (data as any).analytics || false,
        behavioral: (data as any).behavioral || false,
        marketing: (data as any).marketing || false
      });
      setConsentInfo(data);
      setIsLoading(false);
    }
  }, [data]);

  const updateConsentMutation = useMutation({
    mutationFn: async (consentData: any) => {
      return await apiRequest('/api/consent', {
        method: 'POST',
        body: JSON.stringify(consentData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Consent Updated',
        description: 'Your consent preferences have been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consent'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update consent preferences.',
        variant: 'destructive',
      });
    },
  });

  const handleConsentChange = (type: 'analytics' | 'behavioral' | 'marketing', value: boolean) => {
    const newConsents = { ...consents, [type]: value };
    setConsents(newConsents);
    updateConsentMutation.mutate(newConsents);
  };

  if (isLoading) {
    return <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Analytics Consent */}
      <div className="space-y-4">
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <Label htmlFor="consent-analytics" className="text-base font-medium">
                Analytics & Usage Data
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Allow us to collect anonymized usage data to improve the product. This includes page views, feature usage, and performance metrics.
            </p>
            <div className="text-xs text-muted-foreground pt-2">
              <p>• Data is processed by PostHog (GDPR compliant)</p>
              <p>• All data is anonymized and aggregated</p>
              <p>• Never sold to third parties</p>
            </div>
          </div>
          <Switch
            id="consent-analytics"
            checked={consents.analytics}
            onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
            data-testid="switch-consent-analytics"
          />
        </div>
      </div>

      {/* Behavioral Research Consent */}
      <div className="space-y-4">
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <Label htmlFor="consent-behavioral" className="text-base font-medium">
                Behavioral Research & AI Coaching
              </Label>
              <Badge variant="outline" className="ml-2">Beta</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable AI-powered behavioral assessments and personalized coaching based on Fogg Behavior Model, Self-Determination Theory, and COM-B framework.
            </p>
            <div className="text-xs text-muted-foreground pt-2">
              <p>• Required for advanced coaching features</p>
              <p>• Check-in data is hashed, not stored in raw form</p>
              <p>• AI processing by OpenAI (with anonymization)</p>
              <p>• Data retained for 90 days, then auto-deleted</p>
            </div>
          </div>
          <Switch
            id="consent-behavioral"
            checked={consents.behavioral}
            onCheckedChange={(checked) => handleConsentChange('behavioral', checked)}
            data-testid="switch-consent-behavioral"
          />
        </div>
      </div>

      {/* Marketing Consent */}
      <div className="space-y-4">
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Label htmlFor="consent-marketing" className="text-base font-medium">
                Marketing Communications
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Receive product updates, feature announcements, tips, and special offers via email.
            </p>
            <div className="text-xs text-muted-foreground pt-2">
              <p>• Newsletters and product updates</p>
              <p>• Unsubscribe anytime from any email</p>
            </div>
          </div>
          <Switch
            id="consent-marketing"
            checked={consents.marketing}
            onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
            data-testid="switch-consent-marketing"
          />
        </div>
      </div>

      {/* Consent Info */}
      {consentInfo && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-sm font-medium">Consent Status</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {consentInfo.consentedAt && (
              <p>Last updated: {new Date(consentInfo.consentedAt).toLocaleDateString()}</p>
            )}
            <p>Consent version: {consentInfo.consentVersion || '1.0'}</p>
            <p className="pt-2">
              <a href="/docs/privacy-policy.md" target="_blank" className="underline text-primary hover:text-primary/80">
                View Privacy Policy
              </a>
              {' '}to learn more about how we use your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DataExportCard() {
  const { toast } = useToast();
  const [exportType, setExportType] = useState('full');
  const [exportFormat, setExportFormat] = useState('json');
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  const { data: exportHistory, refetch: refetchHistory } = useQuery<any[]>({
    queryKey: ['/api/export/history'],
  });

  const { data: exportStatus } = useQuery<any>({
    queryKey: ['/api/export/status', activeExportId],
    enabled: !!activeExportId,
    refetchInterval: (data: any) => {
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false;
      }
      return 2000;
    },
  });

  const requestExportMutation = useMutation({
    mutationFn: async (data: { exportType: string; format: string }) => {
      return await apiRequest('/api/export/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      trackEvent('data_exported', { format: exportFormat, type: exportType });
      setActiveExportId(data.id);
      refetchHistory();
      toast({
        title: 'Export requested',
        description: 'Your data export is being processed. This may take a few moments.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to request export. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteExportMutation = useMutation({
    mutationFn: async (exportId: string) => {
      return await apiRequest(`/api/export/${exportId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetchHistory();
      toast({
        title: 'Export deleted',
        description: 'Export file has been removed.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete export.',
        variant: 'destructive',
      });
    },
  });

  const handleRequestExport = () => {
    requestExportMutation.mutate({
      exportType,
      format: exportFormat,
    });
  };

  const handleDownload = (exportId: string) => {
    window.open(`/api/export/download/${exportId}`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Your Data
        </CardTitle>
        <CardDescription>
          Download a copy of your data in compliance with GDPR. Exports expire after 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Request Form */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="export-type">Data Type</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger id="export-type" data-testid="select-export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Export (All Data)</SelectItem>
                <SelectItem value="profile">Profile Information</SelectItem>
                <SelectItem value="goals">Goals Only</SelectItem>
                <SelectItem value="tasks">Tasks Only</SelectItem>
                <SelectItem value="habits">Habits Only</SelectItem>
                <SelectItem value="achievements">Achievements Only</SelectItem>
                <SelectItem value="social">Social Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="export-format" data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (Machine Readable)</SelectItem>
                <SelectItem value="csv">CSV/ZIP (Excel Compatible)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRequestExport}
            disabled={requestExportMutation.isPending}
            className="w-full"
            data-testid="button-request-export"
          >
            {requestExportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Request Export
              </>
            )}
          </Button>
        </div>

        {/* Active Export Progress */}
        {activeExportId && exportStatus && exportStatus.status !== 'completed' && exportStatus.status !== 'failed' && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Processing Export</span>
              </div>
              {getStatusBadge(exportStatus.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{exportStatus.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportStatus.progress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {exportStatus.progress < 50 ? 'Collecting your data...' : 'Generating export file...'}
            </p>
          </div>
        )}

        {/* Export History */}
        {exportHistory && exportHistory.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Export History</h4>
              <Badge variant="secondary">{exportHistory.length} exports</Badge>
            </div>

            <div className="space-y-2">
              {exportHistory.map((exp: any) => (
                <div
                  key={exp.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover-elevate"
                  data-testid={`export-item-${exp.id}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {exp.exportType.charAt(0).toUpperCase() + exp.exportType.slice(1)} Export
                      </span>
                      {getStatusBadge(exp.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Format: {exp.format.toUpperCase()}</span>
                      {exp.fileSize && <span>Size: {formatFileSize(exp.fileSize)}</span>}
                      <span>Requested: {formatDate(exp.requestedAt)}</span>
                    </div>
                    {exp.expiresAt && exp.status === 'completed' && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
                        <Clock className="h-3 w-3" />
                        Expires: {formatDate(exp.expiresAt)}
                      </div>
                    )}
                    {exp.errorMessage && (
                      <div className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {exp.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {exp.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(exp.id)}
                        data-testid={`button-download-export-${exp.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExportMutation.mutate(exp.id)}
                      disabled={deleteExportMutation.isPending}
                      data-testid={`button-delete-export-${exp.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GDPR Notice */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">GDPR Compliance</p>
            <p className="text-muted-foreground text-xs">
              You have the right to access, modify, or delete your personal data at any time.
              Exports are automatically deleted after 7 days for security. Downloaded files are your responsibility.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectedAccountsCard() {
  const { toast } = useToast();

  // Fetch connected accounts
  const { data: connectedAccounts, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/auth/connected-accounts'],
  });

  // Unlink account mutation
  const unlinkMutation = useMutation({
    mutationFn: async (provider: string) => {
      return await apiRequest(`/api/auth/unlink/${provider}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      refetch();
      toast({
        title: 'Account unlinked',
        description: 'Your account has been disconnected successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to unlink account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleLinkGoogle = () => {
    window.location.href = '/api/login';
  };

  const handleLinkApple = () => {
    window.location.href = '/api/login';
  };

  const handleUnlink = (provider: string) => {
    if (confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      unlinkMutation.mutate(provider);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return <SiGoogle className="h-5 w-5" />;
      case 'apple':
        return <SiApple className="h-5 w-5" />;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const isConnected = (provider: string) => {
    return connectedAccounts?.some(
      (account) => account.provider.toLowerCase() === provider.toLowerCase()
    );
  };

  const getConnectedAccount = (provider: string) => {
    return connectedAccounts?.find(
      (account) => account.provider.toLowerCase() === provider.toLowerCase()
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          Link your Google and Apple accounts to sign in faster and keep your data synced
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Account */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <SiGoogle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Google</h3>
                  {isConnected('google') ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {getConnectedAccount('google')?.email}
                      </p>
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              <div>
                {isConnected('google') ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('google')}
                    disabled={unlinkMutation.isPending}
                    data-testid="button-unlink-google"
                  >
                    <UnlinkIcon className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkGoogle}
                    data-testid="button-link-google"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                )}
              </div>
            </div>

            {/* Apple Account */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                  <SiApple className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">Apple</h3>
                  {isConnected('apple') ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {getConnectedAccount('apple')?.email}
                      </p>
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              <div>
                {isConnected('apple') ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnlink('apple')}
                    disabled={unlinkMutation.isPending}
                    data-testid="button-unlink-apple"
                  >
                    <UnlinkIcon className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkApple}
                    data-testid="button-link-apple"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Notice */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Account Linking</p>
            <p className="text-muted-foreground text-xs">
              Connecting your accounts allows you to sign in with a single click and keeps your profile data synced.
              You can disconnect at any time without losing your data.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountDeletionCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmations, setConfirmations] = useState({
    dataLoss: false,
    permanent: false,
    gracePeriod: false,
    noRecovery: false,
  });

  const { data: deletionStatus, refetch: refetchDeletionStatus } = useQuery<any>({
    queryKey: ['/api/account/deletion-status'],
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async (data: { reason: string; additionalReason?: string }) => {
      return await apiRequest('/api/account/delete/request', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setShowDialog(false);
      setConfirmEmail('');
      setConfirmations({
        dataLoss: false,
        permanent: false,
        gracePeriod: false,
        noRecovery: false,
      });
      refetchDeletionStatus();
      toast({
        title: 'Deletion Scheduled',
        description: 'Your account will be deleted in 30 days. You can cancel this anytime before then.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to schedule deletion. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/account/delete/cancel', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      refetchDeletionStatus();
      toast({
        title: 'Deletion Cancelled',
        description: 'Your account deletion has been cancelled. Your account is safe.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to cancel deletion. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleRequestDeletion = () => {
    if (confirmEmail !== user?.email) {
      toast({
        title: 'Email Mismatch',
        description: 'Please enter your email address exactly as it appears.',
        variant: 'destructive',
      });
      return;
    }

    const allConfirmed = Object.values(confirmations).every(v => v === true);
    if (!allConfirmed) {
      toast({
        title: 'Confirmations Required',
        description: 'Please confirm all items to proceed.',
        variant: 'destructive',
      });
      return;
    }

    requestDeletionMutation.mutate({
      reason: 'user_request',
      additionalReason: 'User requested account deletion from settings',
    });
  };

  const allConfirmed = Object.values(confirmations).every(v => v === true) && confirmEmail === user?.email;

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delete Account
        </CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <p className="text-sm font-semibold text-destructive">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            This action has serious consequences:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground ml-6">
            <li className="list-disc">All your goals, tasks, and habits will be permanently deleted</li>
            <li className="list-disc">Your achievements, progress, and XP will be lost forever</li>
            <li className="list-disc">Team memberships and social connections will be removed</li>
            <li className="list-disc">Active subscriptions will be cancelled (no refunds)</li>
            <li className="list-disc">You will have a 30-day grace period to cancel this request</li>
          </ul>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              data-testid="button-delete-account"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Account Deletion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Are You Absolutely Sure?
              </DialogTitle>
              <DialogDescription>
                This will schedule your account for permanent deletion in 30 days. You can cancel anytime during this period.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Type your email to confirm: <span className="font-mono text-sm">{user?.email}</span>
                </Label>
                <Input
                  id="confirm-email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Enter your email"
                  data-testid="input-confirm-email"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-medium">I understand that:</p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-data-loss"
                      checked={confirmations.dataLoss}
                      onCheckedChange={(checked) => 
                        setConfirmations(prev => ({ ...prev, dataLoss: checked as boolean }))
                      }
                      data-testid="checkbox-data-loss"
                    />
                    <label htmlFor="confirm-data-loss" className="text-sm text-muted-foreground cursor-pointer">
                      All my data will be permanently deleted
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-permanent"
                      checked={confirmations.permanent}
                      onCheckedChange={(checked) => 
                        setConfirmations(prev => ({ ...prev, permanent: checked as boolean }))
                      }
                      data-testid="checkbox-permanent"
                    />
                    <label htmlFor="confirm-permanent" className="text-sm text-muted-foreground cursor-pointer">
                      This action cannot be undone after 30 days
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-grace"
                      checked={confirmations.gracePeriod}
                      onCheckedChange={(checked) => 
                        setConfirmations(prev => ({ ...prev, gracePeriod: checked as boolean }))
                      }
                      data-testid="checkbox-grace-period"
                    />
                    <label htmlFor="confirm-grace" className="text-sm text-muted-foreground cursor-pointer">
                      I have 30 days to cancel this request
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirm-no-recovery"
                      checked={confirmations.noRecovery}
                      onCheckedChange={(checked) => 
                        setConfirmations(prev => ({ ...prev, noRecovery: checked as boolean }))
                      }
                      data-testid="checkbox-no-recovery"
                    />
                    <label htmlFor="confirm-no-recovery" className="text-sm text-muted-foreground cursor-pointer">
                      My data cannot be recovered after deletion
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                data-testid="button-cancel-dialog"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRequestDeletion}
                disabled={!allConfirmed || requestDeletionMutation.isPending}
                data-testid="button-confirm-deletion"
              >
                {requestDeletionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function GracePeriodBanner() {
  const { toast } = useToast();
  
  const { data: deletionStatus, refetch: refetchDeletionStatus } = useQuery<any>({
    queryKey: ['/api/account/deletion-status'],
  });

  const cancelDeletionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/account/delete/cancel', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      refetchDeletionStatus();
      toast({
        title: 'Deletion Cancelled',
        description: 'Your account is safe. Deletion has been cancelled.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to cancel deletion. Please contact support.',
        variant: 'destructive',
      });
    },
  });

  if (!deletionStatus?.scheduled) {
    return null;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-lg p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            Account Deletion Scheduled
          </h3>
          <p className="text-sm text-muted-foreground">
            Your account will be permanently deleted in <span className="font-bold text-orange-600 dark:text-orange-400">{deletionStatus.daysRemaining} days</span> on {formatDate(deletionStatus.scheduledFor)}.
          </p>
          <p className="text-sm text-muted-foreground">
            All your data will be permanently removed. You can cancel this deletion anytime before the scheduled date.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          variant="default"
          size="lg"
          onClick={() => cancelDeletionMutation.mutate()}
          disabled={cancelDeletionMutation.isPending || !deletionStatus.canCancel}
          className="bg-orange-500 hover:bg-orange-600"
          data-testid="button-cancel-deletion"
        >
          {cancelDeletionMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cancelling...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Deletion
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  
  // Analytics opt-out state
  const [analyticsOptOut, setAnalyticsOptOut] = useState(getAnalyticsOptOutStatus());

  // State for form data
  const [preferences, setPreferences] = useState<UserPreferences>({
    notificationsEnabled: true,
    motivationalQuotes: true,
    celebrationsEnabled: true,
    timezone: 'UTC',
  });

  const [profileData, setProfileData] = useState<ProfileData>({
    learningStyle: 'mixed',
    preferredPace: 'medium',
    difficultyPreference: 'incremental',
    goalCategories: [],
    dailyTimeCommitment: 30,
    preferredCoachingStyle: 'balanced',
  });

  const [voicePreferences, setVoicePreferences] = useState({
    model: 'alloy',
    autoPlay: false,
    speed: 1.0
  });

  const [paymentProvider, setPaymentProvider] = useState<string>('stripe');

  // Subscription and billing queries
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<any>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });

  const { data: coinBalance } = useQuery<any>({
    queryKey: ['/api/coin-balance'],
    enabled: !!user,
  });

  const { data: billingHistory } = useQuery<any>({
    queryKey: ['/api/billing-history'],
    enabled: !!user,
  });

  const { data: coinTransactions } = useQuery<any>({
    queryKey: ['/api/coin-transactions'],
    enabled: !!user,
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/cancel-subscription', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      toast({
        title: 'Subscription updated',
        description: 'We\'re sad to see you go, but you\'re always welcome back to the LiLove family.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Resume subscription mutation
  const resumeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/resume-subscription', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      toast({
        title: 'Subscription resumed',
        description: 'Your subscription has been resumed successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to resume subscription. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      const userData = user as any;
      setPreferences({
        theme: userData.theme || 'system',
        notificationsEnabled: userData.notificationsEnabled ?? true,
        motivationalQuotes: userData.motivationalQuotes ?? true,
        celebrationsEnabled: userData.celebrationsEnabled ?? true,
        timezone: userData.timezone || 'UTC',
        displayName: userData.displayName || '',
        username: userData.username || '',
      });

      if (userData.profile) {
        setProfileData({
          learningStyle: userData.profile.learningStyle || 'mixed',
          preferredPace: userData.profile.preferredPace || 'medium',
          difficultyPreference: userData.profile.difficultyPreference || 'incremental',
          goalCategories: userData.profile.goalCategories || [],
          dailyTimeCommitment: userData.profile.dailyTimeCommitment || 30,
          preferredCoachingStyle: userData.profile.preferredCoachingStyle || 'balanced',
        });
      }

      if (userData.voicePreferences) {
        setVoicePreferences({
          model: userData.voicePreferences.model || 'alloy',
          autoPlay: userData.voicePreferences.autoPlay ?? false,
          speed: userData.voicePreferences.speed || 1.0,
        });
      }
    }
  }, [user]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: UserPreferences) => {
      return await apiRequest('/api/auth/user/preferences', { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Preferences updated',
        description: 'Your preferences have been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      return await apiRequest('/api/auth/user/profile', { 
        method: 'PATCH', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Calendar token query
  const { data: calendarToken, isLoading: tokenLoading } = useQuery<any>({
    queryKey: ['/api/calendar/token'],
    enabled: !!user,
  });

  // Regenerate calendar token mutation
  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/calendar/token/regenerate', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/token'] });
      toast({
        title: 'Token regenerated',
        description: 'Your calendar token has been regenerated successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to regenerate token. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  if (authLoading || !user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Get Firebase token for authorization
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {};
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      // Call the logout API endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      
      // Sign out from Firebase Auth
      const auth = getAuth();
      await firebaseSignOut(auth);
      
      // Clear any local storage data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('firebase-user');
      
      // Show confirmation toast
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/auth';
    }
  };

  const handleSavePreferences = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleSaveVoicePreferences = () => {
    updatePreferencesMutation.mutate({ voicePreferences });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'iCal feed URL copied to clipboard.',
    });
  };

  const getICalFeedUrl = () => {
    if (!calendarToken || !user) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/ical/${user.id}?token=${calendarToken.icalToken}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and profile</p>
      </div>

      {/* Grace Period Warning Banner */}
      <GracePeriodBanner />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general" data-testid="tab-general">
            <User className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="accounts" data-testid="tab-accounts">
            <Users className="h-4 w-4 mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Target className="h-4 w-4 mr-2" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="voice" data-testid="tab-voice">
            <Volume2 className="h-4 w-4 mr-2" />
            Voice AI
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Download className="h-4 w-4 mr-2" />
            Data & Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={preferences.displayName || ''}
                  onChange={(e) => setPreferences({ ...preferences, displayName: e.target.value })}
                  placeholder="How should we address you?"
                  data-testid="input-display-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={preferences.username || ''}
                  onChange={(e) => setPreferences({ ...preferences, username: e.target.value })}
                  placeholder="Your unique username"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                >
                  <SelectTrigger id="timezone" data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSavePreferences}
                disabled={updatePreferencesMutation.isPending}
                data-testid="button-save-account"
              >
                <Save className="h-4 w-4 mr-2" />
                {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.theme')}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    data-testid="button-theme-light"
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    {t('settings.lightMode')}
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    data-testid="button-theme-dark"
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    {t('settings.darkMode')}
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    data-testid="button-theme-system"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    {t('settings.systemMode')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('settings.language')}</Label>
                <div className="flex gap-2">
                  <Button
                    variant={i18n.language === 'en' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      i18n.changeLanguage('en');
                      localStorage.setItem('language', 'en');
                    }}
                    data-testid="button-language-en"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {t('settings.english')}
                  </Button>
                  <Button
                    variant={i18n.language === 'tr' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      i18n.changeLanguage('tr');
                      localStorage.setItem('language', 'tr');
                    }}
                    data-testid="button-language-tr"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {t('settings.turkish')}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="celebrations">Celebration Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Show animations when completing goals
                  </p>
                </div>
                <Switch
                  id="celebrations"
                  checked={preferences.celebrationsEnabled}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, celebrationsEnabled: checked })
                  }
                  data-testid="switch-celebrations"
                />
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Integration
              </CardTitle>
              <CardDescription>
                Sync your goals, tasks, and habits with external calendar apps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* iCal Feed URL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">iCal Feed URL</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Subscribe to this URL in your calendar app to sync all your events
                    </p>
                  </div>
                </div>
                
                {tokenLoading ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading calendar token...</span>
                  </div>
                ) : calendarToken ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={getICalFeedUrl()}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-ical-url"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(getICalFeedUrl())}
                        data-testid="button-copy-ical-url"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Keep this URL private. Anyone with this link can view your calendar events.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No calendar token available. Refresh the page to generate one.
                  </div>
                )}
              </div>

              <Separator />

              {/* Calendar Apps Instructions */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">How to Subscribe</Label>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                    <p>Copy the iCal feed URL above</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                    <p>Open your calendar app (Google Calendar, Apple Calendar, Outlook, etc.)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</div>
                    <p>Find the "Add calendar from URL" or "Subscribe to calendar" option</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</div>
                    <p>Paste the URL and save - your events will sync automatically!</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Token Management */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Security</Label>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      If you believe your calendar URL has been compromised, regenerate it to invalidate the old URL.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => regenerateTokenMutation.mutate()}
                    disabled={regenerateTokenMutation.isPending}
                    data-testid="button-regenerate-token"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${regenerateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                    Regenerate URL
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Quick Links */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Quick Links</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings/addbyurl', '_blank')}
                    data-testid="button-google-calendar"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Google Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022/mac', '_blank')}
                    data-testid="button-apple-calendar"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apple Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c', '_blank')}
                    data-testid="button-outlook-calendar"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Outlook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          {/* Learning Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>Customize your learning experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="learningStyle">Learning Style</Label>
                <Select
                  value={profileData.learningStyle}
                  onValueChange={(value) => setProfileData({ ...profileData, learningStyle: value })}
                >
                  <SelectTrigger id="learningStyle" data-testid="select-learning-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual (diagrams, charts)</SelectItem>
                    <SelectItem value="auditory">Auditory (explanations, discussions)</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic (hands-on practice)</SelectItem>
                    <SelectItem value="mixed">Mixed (combination)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pace">Preferred Pace</Label>
                <Select
                  value={profileData.preferredPace}
                  onValueChange={(value) => setProfileData({ ...profileData, preferredPace: value })}
                >
                  <SelectTrigger id="pace" data-testid="select-pace">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow and steady</SelectItem>
                    <SelectItem value="medium">Moderate pace</SelectItem>
                    <SelectItem value="fast">Fast and intensive</SelectItem>
                    <SelectItem value="adaptive">Adaptive to my progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Preference</Label>
                <Select
                  value={profileData.difficultyPreference}
                  onValueChange={(value) => setProfileData({ ...profileData, difficultyPreference: value })}
                >
                  <SelectTrigger id="difficulty" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incremental">Gradual increase</SelectItem>
                    <SelectItem value="challenge">I like challenges</SelectItem>
                    <SelectItem value="mixed">Mix of easy and hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeCommitment">Daily Time Commitment (minutes)</Label>
                <Input
                  id="timeCommitment"
                  type="number"
                  value={profileData.dailyTimeCommitment}
                  onChange={(e) => setProfileData({ 
                    ...profileData, 
                    dailyTimeCommitment: parseInt(e.target.value) || 30 
                  })}
                  min="5"
                  max="240"
                  data-testid="input-time-commitment"
                />
              </div>

              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-learning"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>

          {/* AI Coach Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>AI Coach Settings</CardTitle>
              <CardDescription>Customize your AI mentor experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coachingStyle">Coaching Style</Label>
                <Select
                  value={profileData.preferredCoachingStyle}
                  onValueChange={(value) => setProfileData({ ...profileData, preferredCoachingStyle: value })}
                >
                  <SelectTrigger id="coachingStyle" data-testid="select-coaching-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supportive">Supportive & Encouraging</SelectItem>
                    <SelectItem value="challenging">Direct & Challenging</SelectItem>
                    <SelectItem value="balanced">Balanced Approach</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="motivationalQuotes">Motivational Quotes</Label>
                  <p className="text-sm text-muted-foreground">
                    Show daily motivational messages
                  </p>
                </div>
                <Switch
                  id="motivationalQuotes"
                  checked={preferences.motivationalQuotes}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, motivationalQuotes: checked })
                  }
                  data-testid="switch-motivational-quotes"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          {/* Voice AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Voice AI Settings</CardTitle>
              <CardDescription>Configure voice input and text-to-speech preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="voiceModel">Voice Model</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose the voice for AI responses
                </p>
                <Select
                  value={voicePreferences.model}
                  onValueChange={(value) => setVoicePreferences({ ...voicePreferences, model: value })}
                >
                  <SelectTrigger id="voiceModel" data-testid="select-voice-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy (Neutral, balanced)</SelectItem>
                    <SelectItem value="echo">Echo (Male, clear)</SelectItem>
                    <SelectItem value="fable">Fable (British, expressive)</SelectItem>
                    <SelectItem value="onyx">Onyx (Deep, authoritative)</SelectItem>
                    <SelectItem value="nova">Nova (Female, energetic)</SelectItem>
                    <SelectItem value="shimmer">Shimmer (Soft, calm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="speechSpeed">Speech Speed: {voicePreferences.speed}x</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Adjust the playback speed of AI voice responses
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">0.75x</span>
                  <input
                    id="speechSpeed"
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.25"
                    value={voicePreferences.speed}
                    onChange={(e) => setVoicePreferences({ ...voicePreferences, speed: parseFloat(e.target.value) })}
                    className="flex-1"
                    data-testid="slider-speech-speed"
                  />
                  <span className="text-sm text-muted-foreground">1.5x</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="autoPlay">Auto-play AI Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically speak AI responses when they arrive
                  </p>
                </div>
                <Switch
                  id="autoPlay"
                  checked={voicePreferences.autoPlay}
                  onCheckedChange={(checked) => 
                    setVoicePreferences({ ...voicePreferences, autoPlay: checked })
                  }
                  data-testid="switch-auto-play"
                />
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveVoicePreferences}
                  disabled={updatePreferencesMutation.isPending}
                  data-testid="button-save-voice-preferences"
                >
                  {updatePreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Voice Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Voice Input Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Input
              </CardTitle>
              <CardDescription>Use voice to interact with your AI Coach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Mic className="w-4 h-4 mt-0.5 text-primary" />
                Click the microphone button in the chat to start recording your voice
              </p>
              <p className="flex items-start gap-2">
                <MicOff className="w-4 h-4 mt-0.5 text-destructive" />
                Click stop when you're finished speaking to transcribe your message
              </p>
              <p className="flex items-start gap-2">
                <Volume2 className="w-4 h-4 mt-0.5 text-primary" />
                Click "Listen" on any AI response to hear it spoken aloud
              </p>
              <p className="flex items-start gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 text-primary" />
                Customize voice model and speed to match your preferences
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Master Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Control how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="allNotifications" className="text-base">All Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for all notification types
                  </p>
                </div>
                <Switch
                  id="allNotifications"
                  checked={preferences.notificationsEnabled}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, notificationsEnabled: checked })
                  }
                  data-testid="switch-all-notifications"
                />
              </div>
            </CardContent>
          </Card>

          {preferences.notificationsEnabled && (
            <>
              {/* Channel Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Bell className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <Label htmlFor="inAppNotifications" className="text-sm font-medium">
                          In-App
                        </Label>
                        <p className="text-xs text-muted-foreground">Pop-up notifications</p>
                      </div>
                      <Switch
                        id="inAppNotifications"
                        defaultChecked
                        data-testid="switch-in-app"
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <Label htmlFor="pushNotifications" className="text-sm font-medium">
                          Browser Push
                        </Label>
                        <p className="text-xs text-muted-foreground">Desktop & mobile</p>
                      </div>
                      <Switch
                        id="pushNotifications"
                        defaultChecked
                        data-testid="switch-push"
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                      <Mail className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <Label htmlFor="emailNotifications" className="text-sm font-medium">
                          Email
                        </Label>
                        <p className="text-xs text-muted-foreground">Daily & weekly digests</p>
                      </div>
                      <Switch
                        id="emailNotifications"
                        defaultChecked
                        data-testid="switch-email"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>Choose which notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="tasks">Tasks</TabsTrigger>
                      <TabsTrigger value="social">Social</TabsTrigger>
                      <TabsTrigger value="achievements">Achievements</TabsTrigger>
                      <TabsTrigger value="system">System</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-3 mt-4">
                      {/* Task & Goal Notifications */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Tasks & Goals
                        </h4>
                        
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="taskReminders" className="text-sm">Task Reminders</Label>
                              <p className="text-xs text-muted-foreground">15 minutes before due time</p>
                            </div>
                            <Switch id="taskReminders" defaultChecked data-testid="switch-task-reminders" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="goalCheckins" className="text-sm">Daily Goal Check-ins</Label>
                              <p className="text-xs text-muted-foreground">Morning & evening reviews</p>
                            </div>
                            <Switch id="goalCheckins" defaultChecked data-testid="switch-goal-checkins" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="deadlineAlerts" className="text-sm">Deadline Alerts</Label>
                              <p className="text-xs text-muted-foreground">1 day and 1 hour before</p>
                            </div>
                            <Switch id="deadlineAlerts" defaultChecked data-testid="switch-deadline-alerts" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Social Notifications */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Social & Teams
                        </h4>
                        
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="friendRequests" className="text-sm">Friend Requests</Label>
                              <p className="text-xs text-muted-foreground">New connection requests</p>
                            </div>
                            <Switch id="friendRequests" defaultChecked data-testid="switch-friend-requests" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="teamInvites" className="text-sm">Team Invites</Label>
                              <p className="text-xs text-muted-foreground">Invitations to join teams</p>
                            </div>
                            <Switch id="teamInvites" defaultChecked data-testid="switch-team-invites" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="messages" className="text-sm">New Messages</Label>
                              <p className="text-xs text-muted-foreground">Direct and team messages</p>
                            </div>
                            <Switch id="messages" defaultChecked data-testid="switch-messages" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Achievement Notifications */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Achievements & Progress
                        </h4>
                        
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="achievements" className="text-sm">Achievement Unlocked</Label>
                              <p className="text-xs text-muted-foreground">Badges and milestones</p>
                            </div>
                            <Switch id="achievements" defaultChecked data-testid="switch-achievements" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="levelUp" className="text-sm">Level Up</Label>
                              <p className="text-xs text-muted-foreground">Rank progression updates</p>
                            </div>
                            <Switch id="levelUp" defaultChecked data-testid="switch-level-up" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="streakWarnings" className="text-sm">Streak Warnings</Label>
                              <p className="text-xs text-muted-foreground">About to lose your streak</p>
                            </div>
                            <Switch id="streakWarnings" defaultChecked data-testid="switch-streak-warnings" />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* AI & Insights */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          AI & Insights
                        </h4>
                        
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="aiInsights" className="text-sm">AI Mentor Insights</Label>
                              <p className="text-xs text-muted-foreground">Personalized tips and guidance</p>
                            </div>
                            <Switch id="aiInsights" defaultChecked data-testid="switch-ai-insights" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="weeklyReports" className="text-sm">Weekly Reports</Label>
                              <p className="text-xs text-muted-foreground">Performance summaries</p>
                            </div>
                            <Switch id="weeklyReports" defaultChecked data-testid="switch-weekly-reports" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="dailyDigest" className="text-sm">Daily Digest</Label>
                              <p className="text-xs text-muted-foreground">Morning briefing email</p>
                            </div>
                            <Switch id="dailyDigest" defaultChecked data-testid="switch-daily-digest" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Quiet Hours</CardTitle>
                  <CardDescription>Set times when you don't want to be disturbed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="quietHours" className="text-sm font-medium">Enable Quiet Hours</Label>
                      <p className="text-xs text-muted-foreground">No notifications during these times</p>
                    </div>
                    <Switch
                      id="quietHours"
                      defaultChecked={false}
                      data-testid="switch-quiet-hours"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quietStart">Start Time</Label>
                      <Select defaultValue="22:00">
                        <SelectTrigger id="quietStart" data-testid="select-quiet-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quietEnd">End Time</Label>
                      <Select defaultValue="08:00">
                        <SelectTrigger id="quietEnd" data-testid="select-quiet-end">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                              {i.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Urgent notifications will still be delivered during quiet hours
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Frequency */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Frequency</CardTitle>
                  <CardDescription>Control how often you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchingMode">Batching Mode</Label>
                    <Select defaultValue="smart">
                      <SelectTrigger id="batchingMode" data-testid="select-batching">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instant">Instant - Get notifications immediately</SelectItem>
                        <SelectItem value="smart">Smart - Group similar notifications</SelectItem>
                        <SelectItem value="hourly">Hourly - Batch every hour</SelectItem>
                        <SelectItem value="daily">Daily - One summary per day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxPerDay">Maximum Notifications Per Day</Label>
                    <Select defaultValue="20">
                      <SelectTrigger id="maxPerDay" data-testid="select-max-per-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 notifications</SelectItem>
                        <SelectItem value="20">20 notifications</SelectItem>
                        <SelectItem value="50">50 notifications</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleSavePreferences}
              disabled={updatePreferencesMutation.isPending}
              size="lg"
              data-testid="button-save-notifications"
            >
              <Save className="h-4 w-4 mr-2" />
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          {/* Connected Accounts */}
          <ConnectedAccountsCard />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Choose your preferred payment provider</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentProvider} onValueChange={setPaymentProvider}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stripe" id="stripe" data-testid="radio-stripe" />
                  <Label htmlFor="stripe" className="cursor-pointer">Stripe (Credit Card)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paddle" id="paddle" data-testid="radio-paddle" />
                  <Label htmlFor="paddle" className="cursor-pointer">Paddle (Merchant of Record)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paygate" id="paygate" data-testid="radio-paygate" />
                  <Label htmlFor="paygate" className="cursor-pointer">PayGate.to (Multi-currency)</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-4">
                {paymentProvider === 'stripe' && 'Stripe offers secure credit card payments with industry-leading security.'}
                {paymentProvider === 'paddle' && 'Paddle acts as merchant of record, handling taxes and compliance automatically.'}
                {paymentProvider === 'paygate' && 'PayGate.to supports multiple currencies and Turkish Lira payments.'}
              </p>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionLoading ? (
                <div className="space-y-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              ) : subscription && subscription.tier !== 'free' ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Crown className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">
                          {subscription.tier?.toUpperCase()} Plan
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Status: <span className="text-foreground">{subscription.status}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                      {subscription.status === 'active' ? 'Active' : 'Cancelled'}
                    </Badge>
                  </div>
                  
                  {subscription.currentPeriodEnd && (
                    <div className="text-sm text-muted-foreground">
                      {subscription.status === 'active' 
                        ? 'Next billing date: ' 
                        : 'Access until: '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setLocation('/pricing')}
                      data-testid="button-change-plan"
                    >
                      Change Plan
                    </Button>
                    {subscription.status === 'active' ? (
                      <Button 
                        variant="destructive"
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending}
                        data-testid="button-cancel-subscription"
                      >
                        {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => resumeSubscriptionMutation.mutate()}
                        disabled={resumeSubscriptionMutation.isPending}
                        data-testid="button-resume-subscription"
                      >
                        {resumeSubscriptionMutation.isPending ? 'Resuming...' : 'Resume Subscription'}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Free Plan</p>
                        <p className="text-sm text-muted-foreground">Limited features</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Current</Badge>
                  </div>
                  <Button 
                    onClick={() => setLocation('/pricing')}
                    className="w-full"
                    data-testid="button-upgrade-subscription"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coin Balance */}
          <Card>
            <CardHeader>
              <CardTitle>Coin Balance</CardTitle>
              <CardDescription>Manage your virtual currency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <Coins className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {coinBalance?.balance || 0} Coins
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Available to spend
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setLocation('/pricing?tab=coins')}
                  data-testid="button-buy-coins"
                >
                  Buy Coins
                </Button>
              </div>

              {/* Recent Coin Transactions */}
              {coinTransactions && coinTransactions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Recent Transactions</h4>
                  <div className="space-y-2">
                    {coinTransactions.slice(0, 3).map((transaction: any) => (
                      <div 
                        key={transaction.id} 
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {transaction.amount > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{transaction.description}</span>
                        </div>
                        <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your payment history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory && billingHistory.length > 0 ? (
                <div className="space-y-3">
                  {billingHistory.map((invoice: any) => (
                    <div 
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{invoice.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(invoice.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">${invoice.amount}</span>
                        {invoice.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.invoiceUrl, '_blank')}
                            data-testid={`button-download-invoice-${invoice.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No billing history available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/25</p>
                  </div>
                </div>
                <Badge variant="secondary">Default</Badge>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-add-payment">
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          {/* Analytics Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analytics & Privacy
              </CardTitle>
              <CardDescription>
                Control how we collect analytics data to improve your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="analytics-toggle" className="text-base font-medium">
                    Analytics Tracking
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve LiLove by sharing anonymous usage data. You can opt out anytime.
                  </p>
                </div>
                <Switch
                  id="analytics-toggle"
                  checked={!analyticsOptOut}
                  onCheckedChange={(checked) => {
                    setAnalyticsOptOut(!checked);
                    setAnalyticsOptOut(!checked);
                    toast({
                      title: checked ? 'Analytics Enabled' : 'Analytics Disabled',
                      description: checked 
                        ? 'We\'ll collect anonymous usage data to improve your experience.' 
                        : 'We\'ve stopped collecting analytics data.',
                    });
                  }}
                  data-testid="switch-analytics"
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-2 pt-2">
                <p>• We respect Do Not Track browser settings automatically</p>
                <p>• All analytics data is anonymized and never sold to third parties</p>
                <p>• Your privacy is important to us - read our <a href="/legal/privacy" className="underline text-primary hover:text-primary/80">Privacy Policy</a> and <a href="/legal/terms" className="underline text-primary hover:text-primary/80">Terms of Service</a></p>
              </div>
            </CardContent>
          </Card>
          
          {/* Consent Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Consent Management
              </CardTitle>
              <CardDescription>
                Control what data we can collect and how we use it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ConsentManagementSection />
            </CardContent>
          </Card>
          
          {/* AI Privacy & Transparency (KVKK Compliant) */}
          <AIPrivacySettings />
          
          {/* Data Export */}
          <DataExportCard />
          
          {/* Account Deletion */}
          <AccountDeletionCard />

          {/* Legal Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal Documents
              </CardTitle>
              <CardDescription>
                View our legal policies and terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">
                      How we collect, use, and protect your data
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/legal/privacy', '_blank')}
                  data-testid="button-view-privacy"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">
                      Rules and guidelines for using LiLove
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/legal/terms', '_blank')}
                  data-testid="button-view-terms"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                <p>Last updated: September 30, 2025</p>
                <p className="mt-1">Compliant with GDPR, KVKK, and App Store requirements</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Account management actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}