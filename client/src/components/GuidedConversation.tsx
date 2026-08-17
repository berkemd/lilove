import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Target, 
  Heart, 
  Sparkles, 
  Lightbulb,
  TrendingUp,
  Users,
  Coffee,
  Clock,
  ChevronRight,
  ArrowRight
} from "lucide-react";

interface ConversationTemplate {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  starterPrompts: string[];
  category: 'goal-setting' | 'reflection' | 'motivation' | 'connection' | 'mindfulness';
  duration: string;
  premium?: boolean;
}

const conversationTemplates: ConversationTemplate[] = [
  {
    id: 'morning-intention',
    title: 'Morning Intention',
    description: 'Start your day with clarity and purpose',
    icon: Coffee,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    starterPrompts: [
      'What is my main focus for today?',
      'What would make today feel successful?',
      'What am I grateful for this morning?'
    ],
    category: 'mindfulness',
    duration: '5 min'
  },
  {
    id: 'goal-breakthrough',
    title: 'Goal Breakthrough',
    description: 'Overcome obstacles and make progress',
    icon: Target,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    starterPrompts: [
      'What goal am I struggling with?',
      'What\'s the smallest step I can take today?',
      'What resources or support do I need?'
    ],
    category: 'goal-setting',
    duration: '10 min'
  },
  {
    id: 'evening-reflection',
    title: 'Evening Reflection',
    description: 'Review your day and celebrate wins',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    starterPrompts: [
      'What went well today?',
      'What did I learn today?',
      'What could I do differently tomorrow?'
    ],
    category: 'reflection',
    duration: '5 min'
  },
  {
    id: 'motivation-boost',
    title: 'Motivation Boost',
    description: 'Reignite your drive and passion',
    icon: TrendingUp,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    starterPrompts: [
      'Why did I start this journey?',
      'What excites me about my goals?',
      'How will I feel when I succeed?'
    ],
    category: 'motivation',
    duration: '7 min'
  },
  {
    id: 'connection-check',
    title: 'Connection Check',
    description: 'Strengthen relationships and network',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    starterPrompts: [
      'Who has supported me recently?',
      'Who could I reach out to today?',
      'How can I add value to someone\'s life?'
    ],
    category: 'connection',
    duration: '5 min'
  },
  {
    id: 'creative-brainstorm',
    title: 'Creative Brainstorm',
    description: 'Generate new ideas and solutions',
    icon: Lightbulb,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    starterPrompts: [
      'What challenge needs a creative solution?',
      'What would I do if I couldn\'t fail?',
      'What unconventional approaches could work?'
    ],
    category: 'goal-setting',
    duration: '10 min',
    premium: true
  }
];

interface GuidedConversationProps {
  onSelectTemplate?: (template: ConversationTemplate, starterPrompt: string) => void;
  isPremium?: boolean;
}

export default function GuidedConversation({ 
  onSelectTemplate,
  isPremium = false
}: GuidedConversationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ConversationTemplate | null>(null);

  const handleTemplateSelect = (template: ConversationTemplate) => {
    if (template.premium && !isPremium) {
      return;
    }
    setSelectedTemplate(template);
  };

  const handlePromptSelect = (prompt: string) => {
    if (selectedTemplate && onSelectTemplate) {
      onSelectTemplate(selectedTemplate, prompt);
    }
  };

  if (selectedTemplate) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className={`${selectedTemplate.bgColor} border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background/50`}>
                <selectedTemplate.icon className={`h-5 w-5 ${selectedTemplate.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{selectedTemplate.title}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedTemplate(null)}
              data-testid="button-back-templates"
            >
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose a question to start your guided conversation:
          </p>
          <div className="space-y-2">
            {selectedTemplate.starterPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptSelect(prompt)}
                className="w-full p-4 text-left rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center justify-between group"
                data-testid={`prompt-${index}`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{prompt}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Estimated duration: {selectedTemplate.duration}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Guided Conversations
        </CardTitle>
        <CardDescription>
          Choose a structured conversation to guide your reflection and growth
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {conversationTemplates.map((template) => {
            const Icon = template.icon;
            const isLocked = template.premium && !isPremium;
            
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`
                  p-4 rounded-xl text-left transition-all duration-200
                  ${template.bgColor}
                  ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-102 hover:shadow-md cursor-pointer'}
                `}
                disabled={isLocked}
                data-testid={`template-${template.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon className={`h-6 w-6 ${template.color}`} />
                  <div className="flex items-center gap-1">
                    {isLocked && (
                      <Badge variant="secondary" className="text-xs">
                        Premium
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {template.duration}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{template.title}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                
                {!isLocked && (
                  <div className="mt-3 flex items-center text-sm font-medium text-muted-foreground">
                    Start conversation
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
