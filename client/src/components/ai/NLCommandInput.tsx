import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { 
  Send, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  ListTodo, 
  TrendingUp, 
  Focus, 
  MessageCircle,
  Loader2,
  Bot,
  User
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'create_goal' | 'create_task' | 'show_progress' | 'daily_focus' | 'general';
  data?: any;
  timestamp: Date;
}

interface CommandResponse {
  type: 'create_goal' | 'create_task' | 'show_progress' | 'daily_focus' | 'general';
  response: string;
  data?: any;
}

interface NLCommandInputProps {
  className?: string;
  onGoalCreated?: (goal: any) => void;
  onTaskCreated?: (task: any) => void;
}

export function NLCommandInput({ className, onGoalCreated, onTaskCreated }: NLCommandInputProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    { icon: Target, text: t('nlCommand.suggestions.createGoal'), example: t('nlCommand.examples.createGoal') },
    { icon: ListTodo, text: t('nlCommand.suggestions.addTask'), example: t('nlCommand.examples.addTask') },
    { icon: TrendingUp, text: t('nlCommand.suggestions.showProgress'), example: t('nlCommand.examples.showProgress') },
    { icon: Focus, text: t('nlCommand.suggestions.dailyFocus'), example: t('nlCommand.examples.dailyFocus') },
  ];

  const commandMutation = useMutation({
    mutationFn: async (cmd: string): Promise<CommandResponse> => {
      const response = await apiRequest('/api/ai-assistant/command', {
        method: 'POST',
        body: JSON.stringify({ command: cmd }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        type: data.type,
        data: data.data,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.type === 'create_goal' && data.data) {
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
        onGoalCreated?.(data.data);
        toast({
          title: t('nlCommand.goalCreated'),
          description: data.data.title,
        });
      } else if (data.type === 'create_task' && data.data) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        onTaskCreated?.(data.data);
        toast({
          title: t('nlCommand.taskCreated'),
          description: data.data.title,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('nlCommand.error'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: t('common.error'),
        description: error.message || t('nlCommand.error'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || commandMutation.isPending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: command.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    commandMutation.mutate(command.trim());
    setCommand('');
  };

  const handleSuggestionClick = (example: string) => {
    setCommand(example);
    setIsSuggestionsOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'create_goal': return <Target className="h-3 w-3" />;
      case 'create_task': return <ListTodo className="h-3 w-3" />;
      case 'show_progress': return <TrendingUp className="h-3 w-3" />;
      case 'daily_focus': return <Focus className="h-3 w-3" />;
      default: return <MessageCircle className="h-3 w-3" />;
    }
  };

  const getTypeBadgeVariant = (type?: string) => {
    switch (type) {
      case 'create_goal': return 'default';
      case 'create_task': return 'secondary';
      case 'show_progress': return 'outline';
      case 'daily_focus': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)} data-testid="card-nl-command">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-coral-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('nlCommand.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('nlCommand.subtitle')}</p>
          </div>
        </div>

        {messages.length > 0 && (
          <ScrollArea 
            ref={scrollRef} 
            className="h-48 rounded-md border bg-muted/30 p-3"
            data-testid="scroll-messages"
          >
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex gap-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-coral-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 max-w-[80%] text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border'
                      )}
                    >
                      <p>{message.content}</p>
                      {message.type && message.role === 'assistant' && (
                        <Badge 
                          variant={getTypeBadgeVariant(message.type)} 
                          className="mt-2 gap-1"
                        >
                          {getTypeIcon(message.type)}
                          {t(`nlCommand.types.${message.type}`)}
                        </Badge>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {commandMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-coral-500 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-background border rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        )}

        <Collapsible open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-muted-foreground"
              data-testid="button-toggle-suggestions"
            >
              <span className="text-xs">{t('nlCommand.suggestions.title')}</span>
              {isSuggestionsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 pt-2"
            >
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 h-auto py-2 px-3 text-left"
                  onClick={() => handleSuggestionClick(suggestion.example)}
                  data-testid={`button-suggestion-${index}`}
                >
                  <suggestion.icon className="h-4 w-4 flex-shrink-0 text-rose-500" />
                  <span className="text-xs truncate">{suggestion.text}</span>
                </Button>
              ))}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={t('nlCommand.placeholder')}
            disabled={commandMutation.isPending}
            className="flex-1"
            data-testid="input-command"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!command.trim() || commandMutation.isPending}
            className="bg-gradient-to-r from-rose-500 to-coral-500 hover:from-rose-600 hover:to-coral-600"
            data-testid="button-send-command"
          >
            {commandMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
