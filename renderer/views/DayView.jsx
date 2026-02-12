import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X, Plus } from 'lucide-react';
import { DEFAULT_TASK_COLOR } from '@/lib/board-utils';

export function DayView({ date, onDateChange, tasks, loading, error, onDelete, onNewTask, onToggleCompletion }) {
  return (
    <div className="flex flex-col h-full min-h-0 p-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Label htmlFor="day-list-date" className="text-sm font-medium">Date</Label>
        <Input
          id="day-list-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-[10rem]"
        />
        <Button type="button" onClick={onNewTask} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New task
        </Button>
      </div>
      {loading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && (
        <ul className="space-y-2 overflow-auto flex-1 min-h-0">
          {tasks.length === 0 ? (
            <li className="text-sm text-muted-foreground py-4">No tasks scheduled for this day.</li>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const headerColor = task.category?.color ?? task.color ?? DEFAULT_TASK_COLOR;
              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-start gap-2 p-0 rounded-lg border border-border bg-card text-card-foreground overflow-hidden",
                    isCompleted && "opacity-60"
                  )}
                >
                  <div
                    className="w-1.5 shrink-0 self-stretch"
                    style={{ backgroundColor: headerColor }}
                    aria-hidden
                  />
                  {onToggleCompletion && (
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleCompletion(task.id, !isCompleted);
                      }}
                      className="h-4 w-4 mt-3 ml-2 cursor-pointer shrink-0"
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    />
                  )}
                  <div className="flex-1 min-w-0 py-3 pr-2">
                    <span className={cn(
                      "font-medium text-sm",
                      isCompleted && "line-through"
                    )}>
                      {task.title}
                    </span>
                    {task.description && (
                      <p className={cn(
                        "text-muted-foreground text-sm mt-0.5 line-clamp-2",
                        isCompleted && "opacity-60"
                      )}>
                        {task.description}
                      </p>
                    )}
                    {(task.tags?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(task.tags || []).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex px-2 py-0.5 rounded text-xs bg-muted/60 text-muted-foreground"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 mt-2"
                    onClick={() => onDelete(task.id)}
                    aria-label="Delete task"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
