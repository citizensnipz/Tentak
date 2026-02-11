import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { X, Pencil, GripVertical } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { DEFAULT_TASK_COLOR, CARD_WIDTH, getTextColorForBackground } from '@/lib/board-utils';

export function TaskCard({
  task,
  position,
  isDragging,
  isExpanded,
  onToggleExpand,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDelete,
  onUpdate,
  onToggleCompletion,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const titleInputRef = useRef(null);
  const cardRef = useRef(null);

  const isControlled = isExpanded !== undefined && onToggleExpand != null;
  const isCollapsed = isControlled ? !isExpanded : internalCollapsed;
  const handleCollapseToggle = isControlled
    ? onToggleExpand
    : () => setInternalCollapsed((c) => !c);

  const headerColor = task.color || DEFAULT_TASK_COLOR;
  const headerTextColor = getTextColorForBackground(headerColor);
  const isCompleted = task.status === 'completed';

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditColor(task.color || DEFAULT_TASK_COLOR);
      setEditScheduledDate(task.scheduled_date || '');
      setShowColorPicker(false);
      if (isControlled) onToggleExpand?.();
      else setInternalCollapsed(false);
      titleInputRef.current?.focus();
    }
  }, [isEditing, task.title, task.description, task.color, task.scheduled_date, isControlled, onToggleExpand]);

  useEffect(() => {
    if (!isEditing) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowColorPicker(false);
        setIsEditing(false);
        setEditTitle('');
        setEditDescription('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  function handleSave() {
    const t = editTitle.trim();
    if (!t) return;
    const desc = editDescription.trim() || null;
    const color = editColor || null;
    const sched = editScheduledDate.trim() || null;
    const changed =
      t !== task.title ||
      desc !== (task.description || null) ||
      (color || DEFAULT_TASK_COLOR) !== (task.color || DEFAULT_TASK_COLOR) ||
      sched !== (task.scheduled_date || null);
    if (!changed) {
      setIsEditing(false);
      return;
    }
    onUpdate(task.id, { title: t, description: desc, color: color || null, scheduled_date: sched });
    setIsEditing(false);
  }

  function handleBlur() {
    const el = cardRef.current;
    if (!el) return;
    setTimeout(() => {
      if (!el.contains(document.activeElement) && !showColorPicker) handleSave();
    }, 0);
  }

  if (!position) return null;

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: CARD_WIDTH,
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'task-card p-0 rounded-xl border border-border bg-background font-sans',
        isEditing ? 'overflow-visible select-text touch-auto cursor-default' : 'overflow-hidden select-none touch-none cursor-default',
        isDragging && 'shadow-lg cursor-grabbing z-[5]',
        !isDragging && !isCollapsed && 'z-[2]',
        !isDragging && isCollapsed && 'z-[1]',
        isCompleted && !isEditing && 'opacity-75'
      )}
      style={cardStyle}
    >
      <div
        className={cn(
          "flex items-center gap-2 h-9 px-3",
          isCompleted && !isEditing && "opacity-60"
        )}
        style={{
          backgroundColor: isEditing ? editColor || DEFAULT_TASK_COLOR : headerColor,
          color: isEditing ? getTextColorForBackground(editColor || DEFAULT_TASK_COLOR) : headerTextColor,
        }}
        onClick={() => {
          if (isEditing) return;
          handleCollapseToggle();
        }}
      >
        <button
          type="button"
          className="shrink-0 flex items-center w-6 h-6 justify-center cursor-grab active:cursor-grabbing text-inherit bg-transparent border-0 p-0"
          onPointerDown={isEditing ? undefined : onPointerDown}
          onPointerMove={isEditing ? undefined : onPointerMove}
          onPointerUp={isEditing ? undefined : onPointerUp}
          onPointerCancel={isEditing ? undefined : onPointerCancel}
          onClick={(e) => {
            // Prevent header click from toggling collapse
            e.stopPropagation();
          }}
          aria-label="Drag task"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        {onToggleCompletion && (
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleCompletion(task.id, !isCompleted);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 mr-2 cursor-pointer shrink-0"
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          />
        )}
        {isEditing ? (
          <Input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 h-8 text-sm font-semibold bg-white/20 border-white/20"
          />
        ) : (
          <span
            className={cn(
              "text-sm font-semibold leading-tight overflow-hidden text-ellipsis whitespace-nowrap flex-1 cursor-pointer",
              isCompleted && "line-through"
            )}
          >
            {task.title}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-inherit opacity-80 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(task.id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          aria-label="Delete task"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
        style={{
          maxHeight: isCollapsed ? 0 : 280,
          opacity: isCollapsed ? 0 : 1,
        }}
      >
        <div className="p-3 min-h-11">
        {isEditing ? (
          <>
            <div className="mb-2 flex items-center gap-2 relative">
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    Change color
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </PopoverContent>
              </Popover>
            </div>
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={handleBlur}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Description"
              rows={2}
              className="min-h-[60px] text-sm text-muted-foreground resize-y"
            />
            <div className="mt-2">
              <Label htmlFor="edit-scheduled-date" className="text-xs text-muted-foreground">Scheduled date (optional)</Label>
              <Input
                id="edit-scheduled-date"
                type="date"
                value={editScheduledDate}
                onChange={(e) => setEditScheduledDate(e.target.value)}
                onBlur={handleBlur}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="mt-1 h-8 text-sm"
              />
            </div>
          </>
        ) : (
          <>
            {task.description && (
              <span className={cn(
                "text-sm text-muted-foreground leading-snug",
                isCompleted && "opacity-60"
              )}>
                {task.description}
              </span>
            )}
            {!isCollapsed && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute bottom-1.5 right-1.5 h-6 w-6 text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsEditing(true);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Edit task"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
