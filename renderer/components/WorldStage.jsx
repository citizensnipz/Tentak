import React, { useState, useRef, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { Table } from './Table';
import {
  CARD_WIDTH,
  computeScale,
  getTaskTableId,
  pointInTable,
  KIND_TO_TABLE_ID,
  DATE_REMIND_KEY,
} from '@/lib/board-utils';

export function WorldStage({
  tasks,
  positions,
  setPositions,
  tables,
  setTables,
  loading,
  error,
  onDelete,
  onUpdate,
  onTaskTableChange,
  onTableUpdate,
  onRequestDeleteTable,
  onLockToggle,
  onToggleCompletion,
  todayStr,
}) {
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
