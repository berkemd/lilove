import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Phone, 
  MessageCircle, 
  Globe, 
  Heart, 
  AlertTriangle,
  Shield,
  X,
  Search,
  ExternalLink,
  HeartHandshake,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CRISIS_HOTLINES, 
  SAFETY_PLAN_TEMPLATE, 
  containsCrisisKeywords,
  detectCrisisLevel,
  type CrisisHotline,
  type SafetyPlanStep 
} from '@/lib/crisisResources';
import { Link } from 'wouter';

interface CrisisSupportProps {
  onNeedHelp?: () => void;
}

interface CrisisBannerProps {
  show: boolean;
  level: 'concern' | 'urgent';
  onClose: () => void;
  onGetHelp: () => void;
}

export function CrisisBanner({ show, level, onClose, onGetHelp }: CrisisBannerProps) {
  if (!show) return null;

  const isUrgent = level === 'urgent';
  const bgColor = isUrgent 
    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
    : 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
  const textColor = isUrgent 
    ? 'text-red-800 dark:text-red-200' 
    : 'text-amber-800 dark:text-amber-200';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-0 left-0 right-0 z-50 p-4 border-b ${bgColor}`}
        data-testid="crisis-banner"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isUrgent ? (
              <AlertTriangle className={`h-6 w-6 ${textColor} flex-shrink-0`} />
            ) : (
              <Heart className={`h-6 w-6 ${textColor} flex-shrink-0`} />
            )}
            <div>
              <p className={`font-semibold ${textColor}`}>
                {isUrgent ? "You're not alone. Help is available." : "We care about you."}
              </p>
              <p className={`text-sm ${textColor} opacity-80`}>
                {isUrgent 
                  ? "If you're in crisis, please reach out for support right now." 
                  : "If you're struggling, support is just a call away."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onGetHelp}
              variant={isUrgent ? "destructive" : "default"}
              className="whitespace-nowrap"
              data-testid="button-get-help-now"
            >
              <Phone className="h-4 w-4 mr-2" />
              Get Help Now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={textColor}
              data-testid="button-close-crisis-banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface HotlineCardProps {
  hotline: CrisisHotline;
}

function HotlineCard({ hotline }: HotlineCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`hotline-card-${hotline.countryCode}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h4 className="font-semibold text-sm">{hotline.name}</h4>
            <Badge variant="secondary" className="mt-1">
              {hotline.country}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            {hotline.hours}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <a 
            href={`tel:${hotline.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-primary hover:underline font-medium"
            data-testid={`link-call-${hotline.countryCode}`}
          >
            <Phone className="h-4 w-4" />
            {hotline.phone}
          </a>
          
          {hotline.textLine && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {hotline.textLine}
            </p>
          )}
          
          {hotline.chatUrl && (
            <a 
              href={hotline.chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
              data-testid={`link-chat-${hotline.countryCode}`}
            >
              <Globe className="h-4 w-4" />
              Online Chat
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        
        <div className="mt-3 flex flex-wrap gap-1">
          {hotline.languages.map(lang => (
            <Badge key={lang} variant="outline" className="text-xs">
              {lang}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SafetyPlanEditorProps {
  onSave?: (plan: Record<string, string>) => void;
}

export function SafetyPlanEditor({ onSave }: SafetyPlanEditorProps) {
  const [plan, setPlan] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('safetyPlan');
    return saved ? JSON.parse(saved) : {};
  });

  const handleChange = (stepId: string, value: string) => {
    const newPlan = { ...plan, [stepId]: value };
    setPlan(newPlan);
    localStorage.setItem('safetyPlan', JSON.stringify(newPlan));
    onSave?.(newPlan);
  };

  return (
    <div className="space-y-4" data-testid="safety-plan-editor">
      <div className="flex items-center gap-2 text-primary">
        <Shield className="h-5 w-5" />
        <h3 className="font-semibold">Your Personal Safety Plan</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        A safety plan helps you recognize warning signs and know what to do in a crisis. 
        Your plan is saved automatically and stored locally on your device.
      </p>
      
      <Accordion type="single" collapsible className="w-full">
        {SAFETY_PLAN_TEMPLATE.map((step, index) => (
          <AccordionItem key={step.id} value={step.id} data-testid={`safety-plan-step-${step.id}`}>
            <AccordionTrigger className="text-left">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <span className="font-medium">{step.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">{step.description}</p>
                <Textarea
                  placeholder={step.placeholder}
                  value={plan[step.id] || ''}
                  onChange={(e) => handleChange(step.id, e.target.value)}
                  className="min-h-[100px]"
                  data-testid={`input-safety-plan-${step.id}`}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        Your safety plan is saved automatically and stored only on your device for privacy.
      </p>
    </div>
  );
}

export function CrisisHotlinesModal() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredHotlines = CRISIS_HOTLINES.filter(hotline =>
    hotline.country.toLowerCase().includes(search.toLowerCase()) ||
    hotline.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="lg" 
          className="gap-2"
          data-testid="button-need-help-now"
        >
          <Phone className="h-5 w-5" />
          I Need Help Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden" data-testid="crisis-hotlines-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HeartHandshake className="h-6 w-6 text-primary" />
            Crisis Support Resources
          </DialogTitle>
          <DialogDescription>
            You are not alone. Help is available 24/7. Choose your country to find support.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-hotlines"
          />
        </div>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredHotlines.map(hotline => (
              <HotlineCard key={`${hotline.countryCode}-${hotline.name}`} hotline={hotline} />
            ))}
          </div>
        </ScrollArea>
        
        <Separator className="my-4" />
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            If your country is not listed, visit:
          </p>
          <a
            href="https://www.befrienders.org/find-a-helpline"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
            data-testid="link-befrienders"
          >
            <Globe className="h-4 w-4" />
            Find a helpline at befrienders.org
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CrisisSupport({ onNeedHelp }: CrisisSupportProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [crisisLevel, setCrisisLevel] = useState<'none' | 'concern' | 'urgent'>('none');

  const checkForCrisis = (text: string) => {
    const level = detectCrisisLevel(text);
    if (level !== 'none') {
      setCrisisLevel(level);
      setShowBanner(true);
    }
  };

  const handleGetHelp = () => {
    setShowBanner(false);
    onNeedHelp?.();
  };

  return (
    <div data-testid="crisis-support">
      <CrisisBanner
        show={showBanner && crisisLevel !== 'none'}
        level={crisisLevel as 'concern' | 'urgent'}
        onClose={() => setShowBanner(false)}
        onGetHelp={handleGetHelp}
      />
      
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartHandshake className="h-5 w-5 text-primary" />
            Crisis Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you're struggling or in crisis, help is always available. 
            You matter, and you deserve support.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <CrisisHotlinesModal />
            <Link href="/safety-resources">
              <Button variant="outline" className="gap-2 w-full sm:w-auto" data-testid="link-safety-resources">
                <Shield className="h-4 w-4" />
                Safety Resources
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { containsCrisisKeywords, detectCrisisLevel };
