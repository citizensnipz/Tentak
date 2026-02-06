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
import { X, Pencil, LayoutGrid, ClipboardList, Plus } from 'lucide-react';

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
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const titleInputRef = useRef(null);
  const cardRef = useRef(null);

  const headerColor = task.color || DEFAULT_TASK_COLOR;
  const headerTextColor = getTextColorForBackground(headerColor);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditColor(task.color || DEFAULT_TASK_COLOR);
      setShowColorPicker(false);
      titleInputRef.current?.focus();
    }
  }, [isEditing, task.title, task.description, task.color]);

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
    const changed =
      t !== task.title ||
      desc !== (task.description || null) ||
      (color || DEFAULT_TASK_COLOR) !== (task.color || DEFAULT_TASK_COLOR);
    if (!changed) {
      setIsEditing(false);
      return;
    }
    onUpdate(task.id, { title: t, description: desc, color: color || null });
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
        !isDragging && 'shadow z-[1]'
      )}
      style={cardStyle}
      onPointerDown={isEditing ? undefined : onPointerDown}
      onPointerMove={isEditing ? undefined : onPointerMove}
      onPointerUp={isEditing ? undefined : onPointerUp}
      onPointerCancel={isEditing ? undefined : onPointerCancel}
    >
      <div
        className="flex items-center h-9 px-3 pr-9"
        style={{
          backgroundColor: isEditing ? editColor || DEFAULT_TASK_COLOR : headerColor,
          color: isEditing ? getTextColorForBackground(editColor || DEFAULT_TASK_COLOR) : headerTextColor,
        }}
      >
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
          <span className="text-sm font-semibold leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
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
          </>
        ) : (
          <>
            {task.description && (
              <span className="text-sm text-muted-foreground leading-snug">
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

function Table({ table, onHeaderPointerDown, onHeaderPointerMove, onHeaderPointerUp, onHeaderPointerCancel }) {
  const headerBg = table.color || DEFAULT_TABLE_COLOR;
  const headerTextColor = getTextColorForBackground(headerBg);
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
        className="table-header flex items-center h-9 px-3 cursor-grab select-none touch-none"
        style={{ backgroundColor: headerBg, color: headerTextColor }}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerCancel}
      >
        <span className="text-sm font-semibold">{table.title}</span>
      </div>
      <div className="flex-1" style={{ height: table.height - 36 }} />
    </div>
  );
}

function CreateTaskModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_TASK_COLOR);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    onSubmit({ title: t, description: description.trim() || null, color: color || null })
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
  const [color, setColor] = useState(DEFAULT_TABLE_COLOR);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = name.trim();
    if (!t) {
      setError('Table name is required');
      return;
    }
    setError(null);
    onSubmit({ name: t, color: color || DEFAULT_TABLE_COLOR });
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
            <Label htmlFor="table-name">Table name (required)</Label>
            <Input
              id="table-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Table name"
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

function pointInTable(px, py, table) {
  return px >= table.x && px <= table.x + table.width && py >= table.y && py <= table.y + table.height;
}

function getTaskTableId(task) {
  return task.table_id || (KIND_TO_TABLE_ID[task.kind] || 'backlog');
}

function WorldStage({ tasks, positions, setPositions, tables, setTables, loading, error, onDelete, onUpdate, onTaskTableChange, onTableUpdate }) {
  const dragInfoRef = useRef(null);
  const tableDragInfoRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [draggingTableId, setDraggingTableId] = useState(null);

  const handleTableHeaderPointerDown = useCallback(
    (tableId) => (event) => {
      if (event.button !== 0) return;
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

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
              onTaskTableChange(taskId, table.id);
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
    [tables, tasks, onTaskTableChange],
  );

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
          onHeaderPointerDown={handleTableHeaderPointerDown(table.id)}
          onHeaderPointerMove={handleTableHeaderPointerMove(table.id)}
          onHeaderPointerUp={handleTableHeaderPointerUp(table.id)}
          onHeaderPointerCancel={handleTableHeaderPointerCancel(table.id)}
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

  const handleCreateTable = useCallback(({ name, color }) => {
    if (typeof window.tentak === 'undefined') return;
    window.tentak
      .mutate({
        operation: 'tableCreate',
        payload: {
          title: name.trim(),
          color: color || DEFAULT_TABLE_COLOR,
          width: DEFAULT_TABLE_WIDTH,
          height: DEFAULT_TABLE_HEIGHT,
          x: NEW_TABLE_CENTER_X,
          y: NEW_TABLE_CENTER_Y,
          is_permanent: 0,
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
          };
          setTables((prev) => [...prev, newTable]);
        }
      });
  }, []);

  const handleCreateTask = useCallback(({ title, description, color }) => {
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
          status: 'pending',
          kind: 'backlog',
          priority: 'normal',
        },
      })
      .then((r) => {
        if (!r.ok) throw new Error(r.error || 'Failed to create task');
        const newTask = r.data;
        setTasks((prev) => [...prev, newTask]);
      });
  }, []);

  const handleDeleteTask = useCallback((id) => {
    if (typeof window.tentak === 'undefined') return;
    window.tentak
      .mutate({ operation: 'taskDelete', payload: { id } })
      .then((r) => {
        if (r.ok) {
          setTasks((prev) => prev.filter((t) => t.id !== id));
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
        }
      });
  }, []);

  const handleTaskTableChange = useCallback(
    (id, tableId) => {
      const kind = TABLE_ID_TO_KIND[tableId];
      if (kind) {
        handleUpdateTask(id, { kind, table_id: null });
      } else {
        handleUpdateTask(id, { table_id: tableId });
      }
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

  return (
    <>
      <WorldCamera>
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
        />
      </WorldCamera>
      <AddMenu
        onNewTask={() => setTaskModalOpen(true)}
        onNewTable={() => setTableModalOpen(true)}
      />
      {taskModalOpen && (
        <CreateTaskModal
          onClose={() => setTaskModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}
      {tableModalOpen && (
        <CreateTableModal
          onClose={() => setTableModalOpen(false)}
          onSubmit={handleCreateTable}
        />
      )}
    </>
  );
}

export default App;
