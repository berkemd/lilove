import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import {
  Brain,
  MessageSquare,
  Heart,
  BarChart3,
  Download,
  Trash2,
  Shield,
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react';

interface AIPrivacySettings {
  aiPersonalizationEnabled: boolean;
  aiHistoryRetention: boolean;
  aiMoodAnalysis: boolean;
  aiAnonymousAnalytics: boolean;
}

export function AIPrivacySettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: settings, isLoading } = useQuery<AIPrivacySettings>({
    queryKey: ['/api/privacy/ai-settings'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AIPrivacySettings>) => {
      return await apiRequest('/api/privacy/ai-settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({
        title: t('aiPrivacy.settingsUpdated'),
        description: t('aiPrivacy.settingsUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/privacy/ai-settings'] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('aiPrivacy.updateError'),
        variant: 'destructive',
      });
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/privacy/ai-history', {
        method: 'DELETE',
        body: JSON.stringify({ confirmDelete: true }),
      });
    },
    onSuccess: () => {
      toast({
        title: t('aiPrivacy.historyDeleted'),
        description: t('aiPrivacy.historyDeletedDesc'),
      });
      setShowDeleteDialog(false);
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('aiPrivacy.deleteError'),
        variant: 'destructive',
      });
    },
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/privacy/ai-data-export', {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lilove-ai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('aiPrivacy.exportSuccess'),
        description: t('aiPrivacy.exportSuccessDesc'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('aiPrivacy.exportError'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSettingChange = (key: keyof AIPrivacySettings, value: boolean) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-ai-privacy-settings">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <CardTitle>{t('aiPrivacy.title')}</CardTitle>
          </div>
          <Badge variant="outline" className="gap-1" data-testid="badge-kvkk-compliance">
            <Shield className="h-3 w-3" />
            {t('aiPrivacy.kvkkCompliant')}
          </Badge>
        </div>
        <CardDescription>{t('aiPrivacy.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between p-4 border rounded-lg" data-testid="setting-ai-personalization">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <Label htmlFor="ai-personalization" className="text-base font-medium">
                {t('aiPrivacy.personalization.title')}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aiPrivacy.personalization.description')}
            </p>
            <div className="text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('aiPrivacy.personalization.note')}
              </p>
            </div>
          </div>
          <Switch
            id="ai-personalization"
            checked={settings?.aiPersonalizationEnabled ?? true}
            onCheckedChange={(checked) => handleSettingChange('aiPersonalizationEnabled', checked)}
            disabled={updateSettingsMutation.isPending}
            data-testid="switch-ai-personalization"
          />
        </div>

        <div className="flex items-start justify-between p-4 border rounded-lg" data-testid="setting-ai-history">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <Label htmlFor="ai-history" className="text-base font-medium">
                {t('aiPrivacy.history.title')}
              </Label>
              <Badge variant="secondary" className="text-xs">{t('aiPrivacy.history.retention')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aiPrivacy.history.description')}
            </p>
            <div className="text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('aiPrivacy.history.note')}
              </p>
            </div>
          </div>
          <Switch
            id="ai-history"
            checked={settings?.aiHistoryRetention ?? true}
            onCheckedChange={(checked) => handleSettingChange('aiHistoryRetention', checked)}
            disabled={updateSettingsMutation.isPending}
            data-testid="switch-ai-history"
          />
        </div>

        <div className="flex items-start justify-between p-4 border rounded-lg" data-testid="setting-ai-mood">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <Label htmlFor="ai-mood" className="text-base font-medium">
                {t('aiPrivacy.mood.title')}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aiPrivacy.mood.description')}
            </p>
            <div className="text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                {t('aiPrivacy.mood.note')}
              </p>
            </div>
          </div>
          <Switch
            id="ai-mood"
            checked={settings?.aiMoodAnalysis ?? true}
            onCheckedChange={(checked) => handleSettingChange('aiMoodAnalysis', checked)}
            disabled={updateSettingsMutation.isPending}
            data-testid="switch-ai-mood"
          />
        </div>

        <div className="flex items-start justify-between p-4 border rounded-lg" data-testid="setting-ai-analytics">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <Label htmlFor="ai-analytics" className="text-base font-medium">
                {t('aiPrivacy.analytics.title')}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aiPrivacy.analytics.description')}
            </p>
            <div className="text-xs text-muted-foreground pt-1">
              <p className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('aiPrivacy.analytics.note')}
              </p>
            </div>
          </div>
          <Switch
            id="ai-analytics"
            checked={settings?.aiAnonymousAnalytics ?? false}
            onCheckedChange={(checked) => handleSettingChange('aiAnonymousAnalytics', checked)}
            disabled={updateSettingsMutation.isPending}
            data-testid="switch-ai-analytics"
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t('aiPrivacy.dataManagement')}</h4>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
              className="gap-2"
              data-testid="button-export-ai-data"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('aiPrivacy.exportButton')}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
              data-testid="button-delete-ai-history"
            >
              <Trash2 className="h-4 w-4" />
              {t('aiPrivacy.deleteButton')}
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4" data-testid="notice-kvkk-info">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('aiPrivacy.kvkkNotice.title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('aiPrivacy.kvkkNotice.description')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('aiPrivacy.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('aiPrivacy.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteHistoryMutation.mutate()}
              disabled={deleteHistoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteHistoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('aiPrivacy.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}