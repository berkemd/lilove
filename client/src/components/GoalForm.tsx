import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Target, Calendar, Trophy } from "lucide-react";

// Goal form validation schema matching the API
const goalFormSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high"]),
  targetDate: z.string().optional(),
  estimatedHours: z.coerce.number().positive().optional(),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  goal?: any; // For editing existing goals
  onSuccess?: () => void;
  children?: React.ReactNode; // For custom trigger elements
}

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  estimatedDuration: number;
  difficultyLevel: number;
  estimatedHours: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export function GoalForm({ goal, onSuccess, children }: GoalFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplates, setShowTemplates] = useState(!goal); // Show templates for new goals
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories and templates
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/goals/categories"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/goals/templates"],
  });

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: goal?.title || "",
      description: goal?.description || "",
      category: goal?.category || "",
      priority: goal?.priority || "medium",
      targetDate: goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
      estimatedHours: goal?.estimatedHours || undefined,
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      return apiRequest("/api/goals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      trackEvent('goal_created', {
        category: variables.category,
        priority: variables.priority,
        has_target_date: !!variables.targetDate,
        estimated_hours: variables.estimatedHours,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Created",
        description: "Your goal has been created successfully!",
      });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      return apiRequest(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goal.id] });
      toast({
        title: "Goal Updated",
        description: "Your goal has been updated successfully!",
      });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GoalFormData) => {
    if (goal) {
      updateGoalMutation.mutate(data);
    } else {
      createGoalMutation.mutate(data);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    form.setValue("title", template.title);
    form.setValue("description", template.description);
    form.setValue("category", template.category);
    form.setValue("priority", template.priority as "low" | "medium" | "high");
    form.setValue("estimatedHours", template.estimatedHours);
    setShowTemplates(false);
  };

  const filteredTemplates = templates.filter(template => 
    !form.watch("category") || template.category === form.watch("category")
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (goal ? (
          <Button variant="outline" size="sm" data-testid="button-edit-goal">
            Edit Goal
          </Button>
        ) : (
          <Button data-testid="button-create-goal">
            <Plus className="mr-2 h-4 w-4" />
            Create Goal
          </Button>
        ))}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
          <DialogDescription>
            {goal ? "Update your goal details below." : "Set a new goal and let our AI help you achieve it."}
          </DialogDescription>
        </DialogHeader>

        {/* Goal Templates */}
        {showTemplates && !goal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Choose a Template</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTemplates(false)}
                data-testid="button-skip-templates"
              >
                Skip Templates
              </Button>
            </div>
            
            <div className="grid gap-3 max-h-60 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleTemplateSelect(template)}
                  data-testid={`template-${template.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{template.title}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {categories.find(c => c.id === template.category)?.name}
                        </Badge>
                        <Badge 
                          variant={template.priority === 'high' ? 'destructive' : 
                                  template.priority === 'medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {template.estimatedDuration} days
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        Level {template.difficultyLevel}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your goal title" {...field} data-testid="input-goal-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your goal in detail..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-goal-description"
                      />
                    </FormControl>
                    <FormDescription>
                      The more detailed your description, the better our AI can help you plan.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-goal-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-goal-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-goal-target-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Hours (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 120"
                          {...field}
                          data-testid="input-goal-estimated-hours"
                        />
                      </FormControl>
                      <FormDescription>
                        How many hours do you think this goal will take?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                data-testid="button-save-goal"
              >
                {createGoalMutation.isPending || updateGoalMutation.isPending ? "Saving..." : 
                 goal ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}