import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, addDays, parseISO } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import { 
  GripVertical, 
  Calendar, 
  Clock, 
  Target, 
  CheckCircle2, 
  ListTodo,
  Edit,
  Trash2,
  Plus,
  Milestone,
  Repeat,
  X,
  Check
} from 'lucide-react';

export interface PlanMilestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  order: number;
}

export interface PlanTask {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  type: 'learning' | 'practice' | 'project' | 'milestone';
  order: number;
}

export interface PlanHabit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'weekdays';
  estimatedMinutes: number;
}

export interface GeneratedPlan {
  summary: string;
  milestones: PlanMilestone[];
  tasks: PlanTask[];
  habits: PlanHabit[];
  estimatedTotalHours: number;
}

interface GoalPlanTimelineProps {
  plan: GeneratedPlan;
  onPlanUpdate: (plan: GeneratedPlan) => void;
}

export function GoalPlanTimeline({ plan, onPlanUpdate }: GoalPlanTimelineProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleTaskDragEnd = (event: DragEndEvent, milestoneId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const milestoneTasks = plan.tasks.filter(t => t.milestoneId === milestoneId);
    const oldIndex = milestoneTasks.findIndex(t => t.id === active.id);
    const newIndex = milestoneTasks.findIndex(t => t.id === over.id);

    const reorderedTasks = arrayMove(milestoneTasks, oldIndex, newIndex);
    const updatedTasks = plan.tasks.map(task => {
      if (task.milestoneId !== milestoneId) return task;
      const newOrder = reorderedTasks.findIndex(t => t.id === task.id);
      return { ...task, order: newOrder };
    });

    onPlanUpdate({ ...plan, tasks: updatedTasks });
  };

  const handleMilestoneDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = plan.milestones.findIndex(m => m.id === active.id);
    const newIndex = plan.milestones.findIndex(m => m.id === over.id);
    const reorderedMilestones = arrayMove(plan.milestones, oldIndex, newIndex);

    onPlanUpdate({ 
      ...plan, 
      milestones: reorderedMilestones.map((m, i) => ({ ...m, order: i }))
    });
  };

  const updateTask = useCallback((taskId: string, updates: Partial<PlanTask>) => {
    const updatedTasks = plan.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    onPlanUpdate({ ...plan, tasks: updatedTasks });
    setEditingTaskId(null);
  }, [plan, onPlanUpdate]);

  const deleteTask = useCallback((taskId: string) => {
    onPlanUpdate({ 
      ...plan, 
      tasks: plan.tasks.filter(t => t.id !== taskId) 
    });
  }, [plan, onPlanUpdate]);

  const updateMilestone = useCallback((milestoneId: string, updates: Partial<PlanMilestone>) => {
    const updatedMilestones = plan.milestones.map(m => 
      m.id === milestoneId ? { ...m, ...updates } : m
    );
    onPlanUpdate({ ...plan, milestones: updatedMilestones });
    setEditingMilestoneId(null);
  }, [plan, onPlanUpdate]);

  const groupedTasks = plan.milestones.map(milestone => ({
    milestone,
    tasks: plan.tasks
      .filter(t => t.milestoneId === milestone.id)
      .sort((a, b) => a.order - b.order),
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1">Your Personalized Plan</h3>
              <p className="text-sm text-muted-foreground">{plan.summary}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Badge variant="secondary" className="gap-1">
                  <Milestone className="w-3 h-3" />
                  {plan.milestones.length} milestones
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <ListTodo className="w-3 h-3" />
                  {plan.tasks.length} tasks
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  ~{plan.estimatedTotalHours}h total
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {plan.habits.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Repeat className="w-4 h-4 text-primary" />
            Daily Habits to Build
          </h4>
          <div className="flex flex-wrap gap-2">
            {plan.habits.map(habit => (
              <Badge key={habit.id} variant="outline" className="gap-1 py-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {habit.title} ({habit.estimatedMinutes}min {habit.frequency})
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Milestones & Tasks</h4>
          <p className="text-xs text-muted-foreground">Drag to reorder</p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleMilestoneDragEnd}
        >
          <SortableContext
            items={plan.milestones.map(m => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {groupedTasks.map(({ milestone, tasks }) => (
                <SortableMilestone
                  key={milestone.id}
                  milestone={milestone}
                  tasks={tasks}
                  isEditing={editingMilestoneId === milestone.id}
                  onStartEdit={() => setEditingMilestoneId(milestone.id)}
                  onSaveEdit={(title) => updateMilestone(milestone.id, { title })}
                  onCancelEdit={() => setEditingMilestoneId(null)}
                  editingTaskId={editingTaskId}
                  onStartTaskEdit={setEditingTaskId}
                  onSaveTaskEdit={updateTask}
                  onCancelTaskEdit={() => setEditingTaskId(null)}
                  onDeleteTask={deleteTask}
                  onTaskDragEnd={(e) => handleTaskDragEnd(e, milestone.id)}
                  sensors={sensors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

interface SortableMilestoneProps {
  milestone: PlanMilestone;
  tasks: PlanTask[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  editingTaskId: string | null;
  onStartTaskEdit: (id: string) => void;
  onSaveTaskEdit: (id: string, updates: Partial<PlanTask>) => void;
  onCancelTaskEdit: () => void;
  onDeleteTask: (id: string) => void;
  onTaskDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function SortableMilestone({
  milestone,
  tasks,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editingTaskId,
  onStartTaskEdit,
  onSaveTaskEdit,
  onCancelTaskEdit,
  onDeleteTask,
  onTaskDragEnd,
  sensors,
}: SortableMilestoneProps) {
  const [editValue, setEditValue] = useState(milestone.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: milestone.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <Milestone className="w-4 h-4 text-primary" />
        
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onSaveEdit(editValue)}>
              <Check className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancelEdit}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-medium flex-1">{milestone.title}</span>
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {format(parseISO(milestone.dueDate), 'MMM d')}
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onStartEdit}>
              <Edit className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onTaskDragEnd}
      >
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y">
            {tasks.map(task => (
              <SortableTask
                key={task.id}
                task={task}
                isEditing={editingTaskId === task.id}
                onStartEdit={() => onStartTaskEdit(task.id)}
                onSaveEdit={(title) => onSaveTaskEdit(task.id, { title })}
                onCancelEdit={onCancelTaskEdit}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}

interface SortableTaskProps {
  task: PlanTask;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function SortableTask({
  task,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: SortableTaskProps) {
  const [editValue, setEditValue] = useState(task.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-red-500',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 hover:bg-muted/30 transition-colors group",
        isDragging && "opacity-50 bg-muted"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      <div className={cn("w-2 h-2 rounded-full", priorityColors[task.priority].replace('text-', 'bg-'))} />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onSaveEdit(editValue)}>
            <Check className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm">{task.title}</span>
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            {task.estimatedMinutes}m
          </Badge>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onStartEdit}>
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
