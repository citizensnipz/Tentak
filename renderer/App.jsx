import React, { useState, useEffect, useRef, useCallback } from 'react';
import WorldCamera from './WorldCamera.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { X, Pencil, LayoutGrid, ClipboardList, Plus, Calendar, LayoutDashboard, Lock, Unlock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEFAULT_TASK_COLOR = '#e0e0e0';

function getTextColorForBackground(hex) {
  if (!hex || typeof hex !== 'string') return '#333';
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#333';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? '#111' : '#fff';
}

function ColorPicker({ value, onChange }) {
  return (
    <input
      type="color"
      value={value || DEFAULT_TASK_COLOR}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-9 cursor-pointer rounded border border-border p-0.5"
      aria-label="Choose color"
    />
  );
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 110;
const CARD_GAP = 40;
const TABLE_HEADER_HEIGHT = 36;
const TABLE_CARD_INSET = 16;

function computeInitialPositionInTable(indexInTable, table) {
  const col = indexInTable % 2;
  const row = Math.floor(indexInTable / 2);
  return {
    x: table.x + TABLE_CARD_INSET + col * (CARD_WIDTH + CARD_GAP),
    y: table.y + TABLE_HEADER_HEIGHT + TABLE_CARD_INSET + row * (CARD_HEIGHT + CARD_GAP),
  };
}

function computeScale(element) {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  const base = element.offsetWidth || CARD_WIDTH;
  if (!base) return 1;
  return rect.width / base;
}

const CARD_HEADER_HEIGHT = 36;

function TaskCard({
  task,
  position,
  isDragging,
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
  const titleInputRef = useRef(null);
  const cardRef = useRef(null);

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
      titleInputRef.current?.focus();
    }
  }, [isEditing, task.title, task.description, task.color, task.scheduled_date]);

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
        isEditing ? 'overflow-visible select-text touch-auto cursor-default' : 'overflow-hidden select-none touch-none cursor-grab',
        isDragging && 'shadow-lg cursor-grabbing z-[5]',
        !isDragging && 'shadow z-[1]',
        isCompleted && !isEditing && 'opacity-75'
      )}
      style={cardStyle}
      onPointerDown={isEditing ? undefined : onPointerDown}
      onPointerMove={isEditing ? undefined : onPointerMove}
      onPointerUp={isEditing ? undefined : onPointerUp}
      onPointerCancel={isEditing ? undefined : onPointerCancel}
    >
      <div
        className={cn(
          "flex items-center h-9 px-3 pr-9",
          isCompleted && !isEditing && "opacity-60"
        )}
        style={{
          backgroundColor: isEditing ? editColor || DEFAULT_TASK_COLOR : headerColor,
          color: isEditing ? getTextColorForBackground(editColor || DEFAULT_TASK_COLOR) : headerTextColor,
        }}
      >
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
          <span className={cn(
            "text-sm font-semibold leading-tight overflow-hidden text-ellipsis whitespace-nowrap flex-1",
            isCompleted && "line-through"
          )}>
            {task.title}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1.5 right-1.5 h-6 w-6 text-inherit opacity-80 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(task.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Delete task"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
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
          </>
        )}
      </div>
    </div>
  );
}

const DEFAULT_TABLES = [
  {
    id: 'backlog',
    title: 'Backlog',
    x: 150,
    y: 150,
    width: 600,
    height: 400,
    color: null,
    is_permanent: 1,
  },
  {
    id: 'today',
    title: 'Today',
    x: 850,
    y: 150,
    width: 600,
    height: 400,
    color: null,
    is_permanent: 1,
  },
];

const DEFAULT_TABLE_COLOR = '#c4c4c4';
const TABLE_ID_TO_KIND = { backlog: 'backlog', today: 'scheduled' };
const KIND_TO_TABLE_ID = { backlog: 'backlog', scheduled: 'today', waiting: 'backlog', external_dependency: 'backlog', someday: 'backlog' };

const DATE_REMIND_KEY = 'tentak.dontRemindDateChange';

function formatTableDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function daysFromToday(dateStr) {
  if (!dateStr || dateStr.length < 10) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (24 * 60 * 60 * 1000));
}

function getTableDisplayTitle(table, todayStr) {
  // Today table: always show "Today" only
  if (table.id === 'today') return 'Today';
  
  const effectiveDate = table.table_date || null;
  if (!effectiveDate) return table.title;
  
  const n = daysFromToday(effectiveDate);
  
  // Tomorrow: always show "Tomorrow" regardless of custom title
  if (n === 1) return 'Tomorrow';
  
  const dayLabel = Math.abs(n) === 1 ? 'day' : 'days';
  const formattedDate = formatTableDate(effectiveDate);
  
  // If custom title exists, use it; otherwise use formatted date
  const displayTitle = table.title.trim() || formattedDate;
  return `${displayTitle} (in ${n} ${dayLabel})`;
}

const PERMANENT_TABLE_IDS = ['backlog', 'today'];

function Table({
  table,
  todayStr,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
  onLockToggle,
  onDeleteClick,
}) {
  const headerBg = table.color || DEFAULT_TABLE_COLOR;
  const headerTextColor = getTextColorForBackground(headerBg);
  const displayTitle = getTableDisplayTitle(table, todayStr);
  const isPermanent = PERMANENT_TABLE_IDS.includes(table.id);
  const locked = Boolean(table.locked);
  const canDrag = !locked;
  return (
    <div
      data-table-id={table.id}
      data-table-width={table.width}
      className="absolute overflow-hidden rounded-lg bg-muted font-sans z-0"
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
      }}
    >
      <div
        className={cn(
          'table-header flex items-center h-9 px-3 select-none touch-none',
          canDrag ? 'cursor-grab' : 'cursor-default'
        )}
        style={{ backgroundColor: headerBg, color: headerTextColor }}
        onPointerDown={canDrag ? onHeaderPointerDown : undefined}
        onPointerMove={canDrag ? onHeaderPointerMove : undefined}
        onPointerUp={canDrag ? onHeaderPointerUp : undefined}
        onPointerCancel={canDrag ? onHeaderPointerCancel : undefined}
      >
        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{displayTitle}</span>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {onLockToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-inherit opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onLockToggle(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={locked ? 'Unlock table' : 'Lock table'}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          )}
          {!isPermanent && onDeleteClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-inherit opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteClick(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Delete table"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1" style={{ height: table.height - 36 }} />
    </div>
  );
}

function CreateTaskModal({ onClose, onSubmit, initialScheduledDate = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_TASK_COLOR);
  const [scheduledDate, setScheduledDate] = useState(initialScheduledDate || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialScheduledDate) setScheduledDate(initialScheduledDate);
  }, [initialScheduledDate]);

  function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    const sched = scheduledDate.trim() || null;
    onSubmit({ title: t, description: description.trim() || null, color: color || null, scheduled_date: sched })
      .then(() => onClose())
      .catch((err) => {
        setError(String(err));
        setSubmitting(false);
      });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title (required)</Label>
            <Input
              id="task-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-scheduled-date">Scheduled date (optional)</Label>
            <Input
              id="task-scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-destructive text-sm mb-2">{error}</div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateTableModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [tableDate, setTableDate] = useState('');
  const [color, setColor] = useState(DEFAULT_TABLE_COLOR);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = name.trim();
    const date = tableDate.trim() || null;
    
    // Validation: if no date, title is required
    if (!date && !t) {
      setError('Table name is required when no date is provided');
      return;
    }
    
    setError(null);
    onSubmit({ name: t, color: color || DEFAULT_TABLE_COLOR, table_date: date });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name">
              Table name {!tableDate.trim() && '(required)'}
            </Label>
            <Input
              id="table-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Table name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-date">Date (optional)</Label>
            <Input
              id="table-date"
              type="date"
              value={tableDate}
              onChange={(e) => setTableDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error && (
            <div className="text-destructive text-sm mb-2">{error}</div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NEW_TABLE_CENTER_X = 1200;
const NEW_TABLE_CENTER_Y = 400;
const DEFAULT_TABLE_WIDTH = 600;
const DEFAULT_TABLE_HEIGHT = 400;

function AddMenu({ onNewTask, onNewTable }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  function handleNewTask() {
    setOpen(false);
    onNewTask();
  }

  function handleNewTable() {
    setOpen(false);
    onNewTable();
  }

  const fabClass = 'h-14 w-14 rounded-full text-xl shadow-md';

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {open && (
        <>
          <Button
            type="button"
            className={`${fabClass} bg-blue-500 hover:bg-blue-600`}
            onClick={handleNewTable}
            aria-label="New table"
            title="New table"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className={`${fabClass} bg-green-600 hover:bg-green-700`}
            onClick={handleNewTask}
            aria-label="New task"
            title="New task"
          >
            <ClipboardList className="h-5 w-5" />
          </Button>
        </>
      )}
      <Button
        type="button"
        className={`${fabClass} bg-green-600 hover:bg-green-700`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open add menu'}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function DayList({ date, onDateChange, tasks, loading, error, onDelete, onNewTask, onToggleCompletion }) {
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

function pointInTable(px, py, table) {
  return px >= table.x && px <= table.x + table.width && py >= table.y && py <= table.y + table.height;
}

function getTaskTableId(task) {
  return task.table_id || (KIND_TO_TABLE_ID[task.kind] || 'backlog');
}

function WorldStage({ tasks, positions, setPositions, tables, setTables, loading, error, onDelete, onUpdate, onTaskTableChange, onTableUpdate, onRequestDeleteTable, onLockToggle, onToggleCompletion, todayStr }) {
  const dragInfoRef = useRef(null);
  const tableDragInfoRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [draggingTableId, setDraggingTableId] = useState(null);
  const [dateChangePending, setDateChangePending] = useState(null);
  const [dontRemindChecked, setDontRemindChecked] = useState(false);

  const handleTableHeaderPointerDown = useCallback(
    (tableId) => (event) => {
      if (event.button !== 0) return;
      const table = tables.find((t) => t.id === tableId);
      if (!table || table.locked) return;

      event.stopPropagation();
      event.preventDefault();

      tableDragInfoRef.current = {
        tableId,
        pointerId: event.pointerId,
        pointerStart: { x: event.clientX, y: event.clientY },
        tableStart: { x: table.x, y: table.y },
      };

      setDraggingTableId(tableId);

      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {}
      }
    },
    [tables],
  );

  const handleTableHeaderPointerMove = useCallback(
    (tableId) => (event) => {
      const info = tableDragInfoRef.current;
      if (!info || info.tableId !== tableId || info.pointerId !== event.pointerId) return;

      event.stopPropagation();
      event.preventDefault();

      const tableEl = event.currentTarget.closest('[data-table-id]');
      const scale = tableEl
        ? (tableEl.getBoundingClientRect?.()?.width || 1) / (parseFloat(tableEl.getAttribute('data-table-width')) || 1)
        : 1;
      const s = scale || 1;
      const dx = (event.clientX - info.pointerStart.x) / s;
      const dy = (event.clientY - info.pointerStart.y) / s;

      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, x: info.tableStart.x + dx, y: info.tableStart.y + dy } : t
        )
      );
    },
    [setTables],
  );

  const finishTableDrag = useCallback(
    (tableId, event, onTableUpdate) => {
      const info = tableDragInfoRef.current;
      if (!info || info.tableId !== tableId || info.pointerId !== event.pointerId) return;

      event.stopPropagation();
      event.preventDefault();

      const table = tables.find((t) => t.id === tableId);
      if (table && onTableUpdate) {
        onTableUpdate(tableId, { x: table.x, y: table.y });
      }

      const dx = table ? table.x - info.tableStart.x : 0;
      const dy = table ? table.y - info.tableStart.y : 0;
      if (dx !== 0 || dy !== 0) {
        setPositions((prev) => {
          const next = { ...prev };
          for (const task of tasks) {
            if (getTaskTableId(task) !== tableId) continue;
            const pos = prev[task.id];
            if (!pos) continue;
            next[task.id] = { x: pos.x + dx, y: pos.y + dy };
          }
          return next;
        });
      }

      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (err) {}
      }

      tableDragInfoRef.current = null;
      setDraggingTableId(null);
    },
    [tables, tasks, setPositions],
  );

  const handleTableHeaderPointerUp = useCallback(
    (tableId) => (event) => finishTableDrag(tableId, event, onTableUpdate),
    [finishTableDrag, onTableUpdate],
  );

  const handleTableHeaderPointerCancel = useCallback(
    (tableId) => (event) => finishTableDrag(tableId, event, onTableUpdate),
    [finishTableDrag, onTableUpdate],
  );

  const handlePointerDown = useCallback(
    (taskId) => (event) => {
      if (event.button !== 0) return;
      const taskPosition = positions[taskId];
      if (!taskPosition) return;

      event.stopPropagation();
      event.preventDefault();

      const scale = computeScale(event.currentTarget);

      dragInfoRef.current = {
        taskId,
        pointerId: event.pointerId,
        pointerStart: { x: event.clientX, y: event.clientY },
        cardStart: { x: taskPosition.x, y: taskPosition.y },
        scale: scale || 1,
      };

      setDraggingId(taskId);

      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (err) {
          // Ignore pointer capture errors in unsupported environments.
        }
      }
    },
    [positions],
  );

  const handlePointerMove = useCallback(
    (taskId) => (event) => {
      const info = dragInfoRef.current;
      if (!info || info.taskId !== taskId || info.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      const currentScale = computeScale(event.currentTarget) || info.scale || 1;
      info.scale = currentScale;

      const dx = (event.clientX - info.pointerStart.x) / currentScale;
      const dy = (event.clientY - info.pointerStart.y) / currentScale;

      const nextPosition = {
        x: info.cardStart.x + dx,
        y: info.cardStart.y + dy,
      };

      setPositions((prev) => {
        const current = prev[taskId];
        if (current && current.x === nextPosition.x && current.y === nextPosition.y) {
          return prev;
        }
        return { ...prev, [taskId]: nextPosition };
      });
    },
    [setPositions],
  );

  const finishDrag = useCallback(
    (taskId, event) => {
      const info = dragInfoRef.current;
      if (!info || info.taskId !== taskId || info.pointerId !== event.pointerId) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      const scale = computeScale(event.currentTarget) || info.scale || 1;
      const dx = (event.clientX - info.pointerStart.x) / scale;
      const dy = (event.clientY - info.pointerStart.y) / scale;
      const finalPos = { x: info.cardStart.x + dx, y: info.cardStart.y + dy };

      if (onTaskTableChange && tables.length > 0) {
        const cx = finalPos.x + CARD_WIDTH / 2;
        const cy = finalPos.y + 80 / 2;
        for (const table of tables) {
          if (pointInTable(cx, cy, table)) {
            const task = tasks.find((t) => t.id === taskId);
            const currentTableId = task
              ? (task.table_id || (KIND_TO_TABLE_ID[task.kind] || 'backlog'))
              : 'backlog';
            if (currentTableId !== table.id) {
              const effectiveDate = table.id === 'today' ? todayStr : (table.table_date || null);
              const newScheduledDate = effectiveDate || null;
              const currentScheduled = (task?.scheduled_date || '').trim() || null;
              const wouldChangeDate = currentScheduled !== newScheduledDate;
              const taskHadDate = !!currentScheduled;
              const dontRemind = typeof localStorage !== 'undefined' && localStorage.getItem(DATE_REMIND_KEY) === 'true';
              if (wouldChangeDate && taskHadDate && !dontRemind) {
                setDateChangePending({ taskId, tableId: table.id, newScheduledDate });
              } else {
                onTaskTableChange(taskId, table.id, newScheduledDate);
              }
            }
            break;
          }
        }
      }

      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (err) {}
      }

      dragInfoRef.current = null;
      setDraggingId(null);
    },
    [tables, tasks, onTaskTableChange, todayStr],
  );

  const handleDateChangeConfirm = useCallback(() => {
    if (dontRemindChecked && typeof localStorage !== 'undefined') {
      localStorage.setItem(DATE_REMIND_KEY, 'true');
    }
    if (dateChangePending && onTaskTableChange) {
      onTaskTableChange(dateChangePending.taskId, dateChangePending.tableId, dateChangePending.newScheduledDate);
    }
    setDateChangePending(null);
    setDontRemindChecked(false);
  }, [dateChangePending, onTaskTableChange, dontRemindChecked]);

  const handleDateChangeCancel = useCallback(() => {
    setDateChangePending(null);
    setDontRemindChecked(false);
  }, []);

  const handlePointerUp = useCallback(
    (taskId) => (event) => finishDrag(taskId, event),
    [finishDrag],
  );

  const handlePointerCancel = useCallback(
    (taskId) => (event) => finishDrag(taskId, event),
    [finishDrag],
  );

  return (
    <div className="relative w-full h-full">
      <AlertDialog open={!!dateChangePending} onOpenChange={(open) => { if (!open) { setDateChangePending(null); setDontRemindChecked(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove date from task?</AlertDialogTitle>
            <AlertDialogDescription>
              Moving this will remove the date assigned to this task. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <input
              type="checkbox"
              id="dont-remind-date"
              className="h-4 w-4 rounded border-border"
              checked={dontRemindChecked}
              onChange={(e) => setDontRemindChecked(e.target.checked)}
            />
            <Label htmlFor="dont-remind-date" className="text-sm font-normal cursor-pointer">Don&apos;t remind me</Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDateChangeCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDateChangeConfirm}>
              Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {loading && (
        <div className="absolute top-4 left-4 py-2 px-3 rounded-lg bg-background/95 border border-border font-sans text-sm text-muted-foreground pointer-events-none">
          Loading tasks…
        </div>
      )}
      {error && (
        <div
          className={cn(
            'absolute left-4 py-2 px-3 rounded-lg border border-destructive/50 font-sans text-sm text-destructive pointer-events-none max-w-[260px] bg-destructive/10',
            loading ? 'top-12' : 'top-4'
          )}
        >
          {error}
        </div>
      )}
      {tables.map((table) => (
        <Table
          key={table.id}
          table={table}
          todayStr={todayStr}
          onHeaderPointerDown={handleTableHeaderPointerDown(table.id)}
          onHeaderPointerMove={handleTableHeaderPointerMove(table.id)}
          onHeaderPointerUp={handleTableHeaderPointerUp(table.id)}
          onHeaderPointerCancel={handleTableHeaderPointerCancel(table.id)}
          onLockToggle={onLockToggle}
          onDeleteClick={onRequestDeleteTable}
        />
      ))}
      {tasks.map((task) => {
        const basePosition = positions[task.id];
        if (!basePosition) return null;
        let position = basePosition;
        if (draggingTableId && getTaskTableId(task) === draggingTableId && tableDragInfoRef.current) {
          const table = tables.find((t) => t.id === draggingTableId);
          if (table) {
            const { tableStart } = tableDragInfoRef.current;
            const dx = table.x - tableStart.x;
            const dy = table.y - tableStart.y;
            position = { x: basePosition.x + dx, y: basePosition.y + dy };
          }
        }
        return (
          <TaskCard
            key={task.id}
            task={task}
            position={position}
            isDragging={draggingId === task.id}
            onPointerDown={handlePointerDown(task.id)}
            onPointerMove={handlePointerMove(task.id)}
            onPointerUp={handlePointerUp(task.id)}
            onPointerCancel={handlePointerCancel(task.id)}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onToggleCompletion={onToggleCompletion}
          />
        );
      })}
    </div>
  );
}

function App() {
  // State initialization
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState({});
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [view, setView] = useState('board');
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayTasks, setDayTasks] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(null);
  const [initialScheduledDateForModal, setInitialScheduledDateForModal] = useState(null);
  const [deleteTablePending, setDeleteTablePending] = useState(null);
  const cameraRef = useRef(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Data loading – tasks
  const fetchTasks = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.tentak === 'undefined') {
      setError('window.tentak not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    window.tentak
      .query({ type: 'allTasks' })
      .then((response) => {
        if (response.ok) {
          setTasks(response.data);
        } else {
          setError(response.error || 'Failed to load tasks');
        }
      })
      .catch((err) => {
        setError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Data loading – tables (merge DB tables into default layout)
  const fetchTables = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.tentak === 'undefined') {
      return;
    }
    window.tentak
      .query({ type: 'allTables' })
      .then((response) => {
        if (response.ok) {
          const loadedTables = response.data.map((t) => ({
            id: t.id,
            title: t.title,
            color: t.color,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            is_permanent: t.is_permanent,
            table_date: t.table_date ?? null,
            locked: t.locked ?? false,
          }));
          setTables((prev) => {
            if (!prev || prev.length === 0) {
              return loadedTables.length > 0 ? loadedTables : DEFAULT_TABLES;
            }
            const byId = new Map(prev.map((t) => [t.id, t]));
            for (const table of loadedTables) {
              const existing = byId.get(table.id);
              byId.set(table.id, existing ? { ...existing, ...table } : table);
            }
            return Array.from(byId.values());
          });
        }
      })
      .catch(() => {
        // Ignore errors, keep defaults
      });
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const fetchDayTasks = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.tentak === 'undefined') return;
    setDayLoading(true);
    setDayError(null);
    window.tentak
      .query({ type: 'tasksByScheduledDate', params: { date: dayDate } })
      .then((response) => {
        if (response.ok) setDayTasks(response.data);
        else setDayError(response.error || 'Failed to load tasks');
      })
      .catch((err) => setDayError(String(err)))
      .finally(() => setDayLoading(false));
  }, [dayDate]);

  useEffect(() => {
    if (view === 'day') fetchDayTasks();
  }, [view, fetchDayTasks]);

  const centerOnToday = useCallback(() => {
    if (!tables.length || !cameraRef.current) return;
    const todayTable = tables.find((t) => t.id === 'today');
    if (todayTable) {
      const cx = todayTable.x + todayTable.width / 2;
      const cy = todayTable.y + todayTable.height / 2;
      requestAnimationFrame(() => {
        cameraRef.current?.centerOnWorldPoint?.(cx, cy);
      });
    }
  }, [tables]);

  const prevViewRef = useRef(view);
  useEffect(() => {
    if (prevViewRef.current !== 'board' && view === 'board') {
      centerOnToday();
    }
    prevViewRef.current = view;
  }, [view, centerOnToday]);

  // Derived layout – card positions from tasks + tables
  useEffect(() => {
    if (tables.length === 0) return;
    setPositions((prev) => {
      const next = {};
      const tableCounts = {};
      tasks.forEach((task) => {
        if (prev[task.id]) {
          next[task.id] = prev[task.id];
        } else {
          const tableId = task.table_id || (KIND_TO_TABLE_ID[task.kind] || 'backlog');
          const table = tables.find((t) => t.id === tableId) || tables.find((t) => t.id === 'backlog') || tables[0];
          if (table) {
            const idx = tableCounts[tableId] ?? 0;
            next[task.id] = computeInitialPositionInTable(idx, table);
            tableCounts[tableId] = idx + 1;
          }
        }
      });
      return next;
    });
  }, [tasks, tables]);

  const handleCreateTable = useCallback(({ name, color, table_date }) => {
    if (typeof window.tentak === 'undefined') return;
    window.tentak
      .mutate({
        operation: 'tableCreate',
        payload: {
          title: name.trim() || '',
          color: color || DEFAULT_TABLE_COLOR,
          width: DEFAULT_TABLE_WIDTH,
          height: DEFAULT_TABLE_HEIGHT,
          x: NEW_TABLE_CENTER_X,
          y: NEW_TABLE_CENTER_Y,
          is_permanent: 0,
          table_date: table_date || null,
        },
      })
      .then((r) => {
        if (r.ok && r.data) {
          const newTable = {
            id: r.data.id,
            title: r.data.title,
            color: r.data.color,
            x: r.data.x,
            y: r.data.y,
            width: r.data.width,
            height: r.data.height,
            table_date: r.data.table_date ?? null,
          };
          setTables((prev) => [...prev, newTable]);
        }
      });
  }, []);

  const handleCreateTask = useCallback(({ title, description, color, scheduled_date }) => {
    if (typeof window.tentak === 'undefined') {
      return Promise.reject(new Error('window.tentak not available'));
    }
    return window.tentak
      .mutate({
        operation: 'taskCreate',
        payload: {
          title,
          description,
          color: color || null,
          scheduled_date: scheduled_date || null,
          status: 'pending',
          kind: 'backlog',
          priority: 'normal',
        },
      })
      .then((r) => {
        if (!r.ok) throw new Error(r.error || 'Failed to create task');
        const newTask = r.data;
        setTasks((prev) => [...prev, newTask]);
        if (view === 'day' && (newTask.scheduled_date || '') === dayDate) {
          setDayTasks((prev) => [...prev, newTask]);
        }
      });
  }, [view, dayDate]);

  const handleDeleteTask = useCallback((id) => {
    if (typeof window.tentak === 'undefined') return;
    window.tentak
      .mutate({ operation: 'taskDelete', payload: { id } })
      .then((r) => {
        if (r.ok) {
          setTasks((prev) => prev.filter((t) => t.id !== id));
          setDayTasks((prev) => prev.filter((t) => t.id !== id));
          setPositions((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      });
  }, []);

  const handleUpdateTask = useCallback((id, updates) => {
    if (typeof window.tentak === 'undefined') return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    window.tentak
      .mutate({ operation: 'taskUpdate', payload: { id, ...updates } })
      .then((r) => {
        if (r.ok && r.data) {
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? r.data : t))
          );
          if (view === 'day') {
            setDayTasks((prev) => {
              const next = prev.filter((t) => t.id !== id);
              if ((r.data.scheduled_date || '') === dayDate) next.push(r.data);
              return next;
            });
          }
        }
      });
  }, [view, dayDate]);

  const handleToggleCompletion = useCallback(
    (id, completed) => {
      handleUpdateTask(id, { status: completed ? 'completed' : 'pending' });
    },
    [handleUpdateTask]
  );

  const handleTaskTableChange = useCallback(
    (id, tableId, newScheduledDate = null) => {
      const kind = TABLE_ID_TO_KIND[tableId];
      const updates = { scheduled_date: newScheduledDate };
      if (kind) {
        updates.kind = kind;
        updates.table_id = null;
      } else {
        updates.table_id = tableId;
      }
      handleUpdateTask(id, updates);
    },
    [handleUpdateTask],
  );

  const handleTableUpdate = useCallback((id, updates) => {
    if (typeof window.tentak === 'undefined') return;
    window.tentak
      .mutate({ operation: 'tableUpdate', payload: { id, ...updates } })
      .then((r) => {
        if (r.ok && r.data) {
          setTables((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
          );
        }
      });
  }, []);

  const handleLockToggle = useCallback(
    (tableId) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;
      handleTableUpdate(tableId, { locked: !table.locked });
    },
    [tables, handleTableUpdate]
  );

  const handleTableDelete = useCallback(
    (tableId, mode) => {
      if (typeof window.tentak === 'undefined') return;
      setDeleteTablePending(null);
      const payload = { id: tableId };
      if (mode === 'tableOnly') payload.moveTasksToBacklog = true;
      if (mode === 'tableAndTasks') payload.deleteTasks = true;
      const taskIdsToRemove = tasks.filter((t) => t.table_id === tableId).map((t) => t.id);
      window.tentak
        .mutate({ operation: 'tableDelete', payload })
        .then((r) => {
          if (r.ok) {
            setTables((prev) => prev.filter((t) => t.id !== tableId));
            if (mode === 'tableOnly') {
              setTasks((prev) =>
                prev.map((t) =>
                  t.table_id === tableId ? { ...t, table_id: null, kind: 'backlog' } : t
                )
              );
            } else if (mode === 'tableAndTasks') {
              setTasks((prev) => prev.filter((t) => t.table_id !== tableId));
              setPositions((prev) => {
                const next = { ...prev };
                taskIdsToRemove.forEach((id) => delete next[id]);
                return next;
              });
            }
          }
        });
    },
    [tasks]
  );

  const handleRequestDeleteTable = useCallback(
    (tableId) => {
      const taskCount = tasks.filter((t) => t.table_id === tableId).length;
      if (taskCount === 0) {
        handleTableDelete(tableId, 'immediate');
      } else {
        setDeleteTablePending({ tableId, taskCount });
      }
    },
    [tasks, handleTableDelete]
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-1 p-2 border-b border-border bg-background shrink-0">
        <Button
          type="button"
          variant={view === 'board' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('board')}
          aria-pressed={view === 'board'}
        >
          <LayoutDashboard className="h-4 w-4 mr-1.5" />
          Board
        </Button>
        <Button
          type="button"
          variant={view === 'day' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('day')}
          aria-pressed={view === 'day'}
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          Day
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
      {view === 'board' && (
        <>
          <WorldCamera ref={cameraRef}>
            <WorldStage
              tasks={tasks}
              positions={positions}
              setPositions={setPositions}
              tables={tables}
              setTables={setTables}
              loading={loading}
              error={error}
              onDelete={handleDeleteTask}
              onUpdate={handleUpdateTask}
              onTaskTableChange={handleTaskTableChange}
              onTableUpdate={handleTableUpdate}
              onRequestDeleteTable={handleRequestDeleteTable}
              onLockToggle={handleLockToggle}
              onToggleCompletion={handleToggleCompletion}
              todayStr={todayStr}
            />
          </WorldCamera>
          <AddMenu
            onNewTask={() => {
              setInitialScheduledDateForModal(null);
              setTaskModalOpen(true);
            }}
            onNewTable={() => setTableModalOpen(true)}
          />
        </>
      )}
      {view === 'day' && (
        <DayList
          date={dayDate}
          onDateChange={setDayDate}
          tasks={dayTasks}
          loading={dayLoading}
          error={dayError}
          onDelete={handleDeleteTask}
          onNewTask={() => {
            setInitialScheduledDateForModal(dayDate);
            setTaskModalOpen(true);
          }}
          onToggleCompletion={handleToggleCompletion}
        />
      )}
      </div>
      {taskModalOpen && (
        <CreateTaskModal
          onClose={() => setTaskModalOpen(false)}
          onSubmit={handleCreateTask}
          initialScheduledDate={initialScheduledDateForModal}
        />
      )}
      {tableModalOpen && (
        <CreateTableModal
          onClose={() => setTableModalOpen(false)}
          onSubmit={handleCreateTable}
        />
      )}
      <AlertDialog open={!!deleteTablePending} onOpenChange={(open) => { if (!open) setDeleteTablePending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks are associated with this table. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setDeleteTablePending(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="secondary"
              onClick={() => {
                if (deleteTablePending) handleTableDelete(deleteTablePending.tableId, 'tableOnly');
              }}
            >
              Delete table only
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTablePending) handleTableDelete(deleteTablePending.tableId, 'tableAndTasks');
              }}
            >
              Delete table and tasks
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
