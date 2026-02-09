import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X, Plus } from 'lucide-react';

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
              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex items-start gap-2 p-3 rounded-lg border border-border bg-card text-card-foreground",
                    isCompleted && "opacity-60"
                  )}
                >
                  {onToggleCompletion && (
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleCompletion(task.id, !isCompleted);
                      }}
                      className="h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    />
                  )}
                  <div className="flex-1 min-w-0">
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
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
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
