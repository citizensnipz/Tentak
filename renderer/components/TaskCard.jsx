import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { X, Pencil, GripVertical, ChevronDown } from 'lucide-react';
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
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editTagIds, setEditTagIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const titleInputRef = useRef(null);
  const cardRef = useRef(null);

  const isControlled = isExpanded !== undefined && onToggleExpand != null;
  const isCollapsed = isControlled ? !isExpanded : internalCollapsed;
  const handleCollapseToggle = isControlled
    ? onToggleExpand
    : () => setInternalCollapsed((c) => !c);

  const displayColor = task.category?.color ?? task.color ?? DEFAULT_TASK_COLOR;
  const editDisplayColor = (() => {
    const cat = categories.find((c) => c.id === editCategoryId);
    return cat?.color ?? editColor ?? DEFAULT_TASK_COLOR;
  })();
  const headerColor = isEditing ? editDisplayColor : displayColor;
  const headerTextColor = getTextColorForBackground(headerColor);
  const isCompleted = task.status === 'completed';

  useEffect(() => {
    if (!isEditing) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditColor(task.color || DEFAULT_TASK_COLOR);
    setEditScheduledDate(task.scheduled_date || '');
    setEditCategoryId(task.category?.id ?? task.category_id ?? null);
    setEditTagIds(new Set((task.tags ?? []).map((t) => t.id)));
    setShowColorPicker(false);
    if (typeof window?.tentak !== 'undefined') {
      window.tentak.query({ type: 'categoriesByUser' }).then((r) => {
        if (r.ok) setCategories(r.data ?? []);
      });
      window.tentak.query({ type: 'tagsByUser' }).then((r) => {
        if (r.ok) setTags(r.data ?? []);
      });
    }
    if (!isControlled) setInternalCollapsed(false);
    titleInputRef.current?.focus();
  }, [isEditing, task.title, task.description, task.color, task.scheduled_date, task.category, task.category_id, task.tags, isControlled]);

  function handleCancelEdit() {
    setShowColorPicker(false);
    setIsEditing(false);
    setEditTitle('');
    setEditDescription('');
    setEditColor('');
    setEditScheduledDate('');
    setEditCategoryId(null);
    setEditTagIds(new Set());
  }

  useEffect(() => {
    if (!isEditing) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleCancelEdit();
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
    const catId = editCategoryId ?? null;
    const tagIdList = [...editTagIds];
    const prevCatId = task.category?.id ?? task.category_id ?? null;
    const prevTagIds = (task.tags ?? []).map((x) => x.id).sort();
    const changed =
      t !== task.title ||
      desc !== (task.description || null) ||
      (color || DEFAULT_TASK_COLOR) !== (task.color || DEFAULT_TASK_COLOR) ||
      sched !== (task.scheduled_date || null) ||
      catId !== prevCatId ||
      JSON.stringify(tagIdList.sort()) !== JSON.stringify(prevTagIds);
    if (!changed) {
      setIsEditing(false);
      return;
    }
    onUpdate(task.id, { title: t, description: desc, color: color || null, scheduled_date: sched, category_id: catId, tag_ids: tagIdList });
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
          backgroundColor: headerColor,
          color: headerTextColor,
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
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {categories.find((c) => c.id === editCategoryId)?.name ?? 'Category'}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded" onClick={() => setEditCategoryId(null)}>None</button>
                  {categories.map((c) => (
                    <button key={c.id} type="button" className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2 rounded" onClick={() => setEditCategoryId(c.id)}>
                      <span className="h-3 w-3 rounded shrink-0 border" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    Tags ({editTagIds.size})
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 max-h-40 overflow-y-auto p-1" onClick={(e) => e.stopPropagation()}>
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={cn('w-full px-2 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2 rounded', editTagIds.has(t.id) && 'bg-accent')}
                      onClick={() => setEditTagIds((prev) => { const n = new Set(prev); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}
                    >
                      <span className={cn('h-3 w-3 rounded border shrink-0', editTagIds.has(t.id) ? 'bg-primary border-primary' : 'border-border')} />
                      {t.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} onPointerDown={(e) => e.stopPropagation()}>
                    Color
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
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
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCancelEdit();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSave();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                Save
              </Button>
            </div>
          </>
        ) : (
          <>
            {task.description && (
              <span className={cn(
                "text-sm text-muted-foreground leading-snug block",
                isCompleted && "opacity-60"
              )}>
                {task.description}
              </span>
            )}
            {(task.tags?.length > 0) && !isCollapsed && (
              <div className="flex flex-wrap gap-1 mt-2">
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
