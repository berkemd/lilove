import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Phone, 
  MessageCircle, 
  Globe, 
  Heart, 
  Shield,
  Search,
  ExternalLink,
  HeartHandshake,
  Sparkles,
  BookOpen,
  Lightbulb,
  Users,
  Clock,
  ArrowLeft
} from "lucide-react";
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  CRISIS_HOTLINES, 
  COPING_STRATEGIES,
  type CrisisHotline 
} from '@/lib/crisisResources';
import { SafetyPlanEditor, CrisisHotlinesModal } from '@/components/CrisisSupport';

function HotlineListItem({ hotline }: { hotline: CrisisHotline }) {
  return (
    <Card className="hover-elevate" data-testid={`hotline-item-${hotline.countryCode}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold">{hotline.name}</h3>
              <Badge variant="secondary">{hotline.country}</Badge>
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm">
              <a 
                href={`tel:${hotline.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
                data-testid={`link-call-${hotline.countryCode}`}
              >
                <Phone className="h-4 w-4" />
                {hotline.phone}
              </a>
              
              {hotline.textLine && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {hotline.textLine}
                </span>
              )}
              
              {hotline.chatUrl && (
                <a 
                  href={hotline.chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                  data-testid={`link-chat-${hotline.countryCode}`}
                >
                  <Globe className="h-4 w-4" />
                  Online Chat
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-start sm:items-end gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hotline.hours}
            </Badge>
            <div className="flex flex-wrap gap-1">
              {hotline.languages.map(lang => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CopingStrategyCard({ category, strategies }: { category: string; strategies: string[] }) {
  return (
    <Card data-testid={`coping-category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          {category}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {strategies.map((strategy, index) => (
            <li 
              key={index} 
              className="flex items-start gap-2 text-sm text-muted-foreground"
              data-testid={`coping-strategy-${index}`}
            >
              <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
              {strategy}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function SafetyResources() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('hotlines');
  const isMobile = useIsMobile();

  const countries = ['all', ...Array.from(new Set(CRISIS_HOTLINES.map(h => h.country)))];
  
  const filteredHotlines = CRISIS_HOTLINES.filter(hotline => {
    const matchesSearch = 
      hotline.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotline.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || hotline.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6" data-testid="page-safety-resources">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-to-dashboard">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <HeartHandshake className="h-8 w-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Safety Resources</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            You are not alone. Whether you're in crisis or just need someone to talk to,
            help is available. Your life matters, and there are people who care about you.
          </p>
        </div>

        <div className="flex justify-center">
          <CrisisHotlinesModal />
        </div>
      </motion.div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5">
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span className="font-semibold">Remember</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Crisis feelings are temporary, even when they don't feel that way.
            Reaching out for help is a sign of strength, not weakness.
            You deserve support and kindness—especially from yourself.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} max-w-md mx-auto`}>
          <TabsTrigger value="hotlines" className="gap-2" data-testid="tab-hotlines">
            <Phone className="h-4 w-4" />
            <span className={isMobile ? 'sr-only' : ''}>Hotlines</span>
            {isMobile && 'Hotlines'}
          </TabsTrigger>
          <TabsTrigger value="safety-plan" className="gap-2" data-testid="tab-safety-plan">
            <Shield className="h-4 w-4" />
            <span className={isMobile ? 'sr-only' : ''}>Safety Plan</span>
            {isMobile && 'Plan'}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="coping" className="gap-2" data-testid="tab-coping">
              <Lightbulb className="h-4 w-4" />
              Coping
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="hotlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                International Crisis Hotlines
              </CardTitle>
              <CardDescription>
                Find crisis support in your country. All resources are verified and available for immediate help.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by country or organization..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-resources"
                  />
                </div>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-country">
                    <SelectValue placeholder="Filter by country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>
                        {country === 'all' ? 'All Countries' : country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {filteredHotlines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hotlines found matching your search.</p>
                    <a
                      href="https://www.befrienders.org/find-a-helpline"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      Find more resources at befrienders.org
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  filteredHotlines.map(hotline => (
                    <HotlineListItem 
                      key={`${hotline.countryCode}-${hotline.name}`} 
                      hotline={hotline} 
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety-plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Create Your Safety Plan
              </CardTitle>
              <CardDescription>
                A safety plan is a personalized, practical plan that helps you recognize and respond
                to warning signs of a mental health crisis. Fill in each section with your own responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SafetyPlanEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Coping Strategies
              </CardTitle>
              <CardDescription>
                These strategies can help you manage difficult moments. 
                Remember, it's okay to try different things to find what works best for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {COPING_STRATEGIES.map(({ category, strategies }) => (
                  <CopingStrategyCard 
                    key={category} 
                    category={category} 
                    strategies={strategies} 
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isMobile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-primary" />
              Coping Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {COPING_STRATEGIES.map(({ category, strategies }) => (
                <CopingStrategyCard 
                  key={category} 
                  category={category} 
                  strategies={strategies} 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="text-center space-y-4 pb-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-sm">Additional Resources</span>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://www.befrienders.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            data-testid="link-befrienders-footer"
          >
            <Globe className="h-4 w-4" />
            Befrienders Worldwide
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://www.iasp.info/resources/Crisis_Centres/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            data-testid="link-iasp-footer"
          >
            <Globe className="h-4 w-4" />
            IASP Crisis Centers
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://findahelpline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
            data-testid="link-findahelpline-footer"
          >
            <Globe className="h-4 w-4" />
            Find A Helpline
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          If you're in immediate danger, please call your local emergency services (911 in US, 999 in UK, 112 in EU).
        </p>
      </div>
    </div>
  );
}
