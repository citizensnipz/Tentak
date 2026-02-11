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
  CARD_HEIGHT,
  TABLE_HEADER_HEIGHT,
  TABLE_CARD_INSET,
  computeScale,
  getTaskTableId,
  pointInTable,
  KIND_TO_TABLE_ID,
  DATE_REMIND_KEY,
  cardIntersectsTable,
  computeSnappedPositionInTable,
  computeLayoutIndexForDrop,
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
  const [expandedTaskId, setExpandedTaskId] = useState(null);

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

      // For snapped cards (with table_order AND table_id), positions are recomputed from table + layoutIndex
      // Only update positions for free-floating cards (no table_order)
      // Snapped cards will be recomputed by BoardView effect - DO NOT add deltas
      const dx = table ? table.x - info.tableStart.x : 0;
      const dy = table ? table.y - info.tableStart.y : 0;
      if (dx !== 0 || dy !== 0) {
        setPositions((prev) => {
          const next = { ...prev };
          for (const task of tasks) {
            // Only update positions for cards that are NOT snapped
            // Snapped cards have table_order and table_id, and their positions are computed from table + layoutIndex
            const isSnapped = (task.table_order !== null && task.table_order !== undefined) &&
                             (task.table_id === tableId);
            
            if (isSnapped) {
              // Skip snapped cards - they will be recomputed by BoardView effect
              continue;
            }
            
            // For non-snapped cards, check if they're associated with this table
            const taskTableId = getTaskTableId(task);
            if (taskTableId !== tableId) continue;
            
            const pos = prev[task.id];
            if (!pos) continue;
            
            // Update position for free-floating cards
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

      const moveThreshold = 5;
      if (Math.abs(dx) < moveThreshold && Math.abs(dy) < moveThreshold) {
        dragInfoRef.current = null;
        setDraggingId(null);
        return;
      }

      const finalPos = { x: info.cardStart.x + dx, y: info.cardStart.y + dy };

      const task = tasks.find((t) => t.id === taskId);
      // Determine current table: prioritize table_id (snapped) over kind-based
      const currentTableId = task?.table_id || (task ? (KIND_TO_TABLE_ID[task.kind] || 'backlog') : 'backlog');

      // Check if card intersects with any table
      let snappedTable = null;
      let snappedOrder = null;
      let snappedPosition = finalPos;

      if (onTaskTableChange && tables.length > 0) {
        for (const table of tables) {
          if (cardIntersectsTable(finalPos.x, finalPos.y, table)) {
            snappedTable = table;
            
            // All tables use the same snapping logic
            // Determine which tasks are in this table
            const existingTasksInTable = tasks.filter(
              (t) => {
                // Check if task is assigned to this table
                // Priority: table_id (for snapped cards) > kind-based (for permanent tables)
                if (t.table_id === table.id) {
                  // Task is snapped to this table via table_id
                  return t.id !== taskId;
                } else if ((table.id === 'backlog' || table.id === 'today') && !t.table_id) {
                  // For permanent tables: check kind-based association only if no table_id
                  const tTableId = KIND_TO_TABLE_ID[t.kind] || 'backlog';
                  return tTableId === table.id && t.id !== taskId;
                }
                return false;
              }
            );
            
            // Compute snapped position and layout index using column-based flow
            snappedOrder = computeLayoutIndexForDrop(finalPos.x, finalPos.y, table, existingTasksInTable);
            snappedPosition = computeSnappedPositionInTable(snappedOrder, table);
            
            break;
          }
        }
      }

      // Update position to snapped position if snapped
      if (snappedTable && snappedPosition) {
        setPositions((prev) => ({
          ...prev,
          [taskId]: snappedPosition,
        }));
      }

      // Handle table assignment
      if (onTaskTableChange && snappedTable) {
        const targetTableId = snappedTable.id;
        const isPermanentTable = targetTableId === 'backlog' || targetTableId === 'today';
        
        // Check if card is actually moving to a different table
        // For snapped cards, compare table_id; for non-snapped, compare effective table ID
        const currentTableIdForSnapped = task?.table_id;
        const isMovingToDifferentTable = currentTableIdForSnapped !== targetTableId;
        
        if (isMovingToDifferentTable) {
          // Moving to a different table
          // Get existing tasks in target table (only snapped cards with table_id matching)
          const existingTasksInTargetTable = tasks.filter(
            (t) => {
              // Only consider tasks that are snapped to this table (have table_id matching)
              return t.table_id === targetTableId && t.id !== taskId;
            }
          );
          
          // Shift existing tasks if inserting at occupied position
          if (snappedOrder !== null) {
            const occupiedIndices = new Set(
              existingTasksInTargetTable
                .filter(t => t.table_order !== null && t.table_order !== undefined)
                .map(t => t.table_order ?? 0)
            );
            
            if (occupiedIndices.has(snappedOrder)) {
              // Shift tasks at/after the insertion point
              existingTasksInTargetTable
                .filter(t => {
                  const order = t.table_order ?? 0;
                  return order >= snappedOrder;
                })
                .forEach((t) => {
                  const newOrder = (t.table_order ?? 0) + 1;
                  onTaskTableChange(t.id, targetTableId, null, newOrder);
                });
            }
          }
          
          const effectiveDate = targetTableId === 'today' ? todayStr : (snappedTable.table_date || null);
          const newScheduledDate = effectiveDate || null;
          const currentScheduled = (task?.scheduled_date || '').trim() || null;
          const wouldChangeDate = currentScheduled !== newScheduledDate;
          const taskHadDate = !!currentScheduled;
          const dontRemind = typeof localStorage !== 'undefined' && localStorage.getItem(DATE_REMIND_KEY) === 'true';
          if (wouldChangeDate && taskHadDate && !dontRemind) {
            setDateChangePending({ taskId, tableId: targetTableId, newScheduledDate, tableOrder: snappedOrder });
          } else {
            onTaskTableChange(taskId, targetTableId, newScheduledDate, snappedOrder);
          }
        } else if (snappedOrder !== null && currentTableIdForSnapped === targetTableId) {
          // Same table but order changed (reordering within table)
          // Get existing tasks in this table (only snapped cards with table_id matching)
          const existingTasksInTable = tasks.filter(
            (t) => {
              // Only consider tasks that are snapped to this table (have table_id matching)
              return t.table_id === targetTableId && t.id !== taskId;
            }
          );
          
          const currentOrder = task?.table_order ?? null;
          
          // If moving to a different position, shift other tasks
          if (currentOrder !== null && currentOrder !== snappedOrder) {
            // Shift tasks between old and new position
            const tasksToShift = existingTasksInTable.filter((t) => {
              const order = t.table_order ?? 0;
              if (currentOrder < snappedOrder) {
                // Moving down: shift tasks between old and new position up
                return order > currentOrder && order <= snappedOrder;
              } else {
                // Moving up: shift tasks between new and old position down
                return order >= snappedOrder && order < currentOrder;
              }
            });
            
            // Update shifted tasks
            tasksToShift.forEach((t) => {
              const order = t.table_order ?? 0;
              const newOrder = currentOrder < snappedOrder ? order - 1 : order + 1;
              onTaskTableChange(t.id, targetTableId, null, newOrder);
            });
          }
          
          // Update the moved task
          onTaskTableChange(taskId, targetTableId, null, snappedOrder);
        }
      } else if (snappedTable === null) {
        // Card was dragged outside any table - fully detach it
        // Check if card is currently assigned to a table (by table_id, not by kind)
        const hasTableId = task?.table_id !== null && task?.table_id !== undefined;
        
        if (hasTableId) {
          // Card has table_id set, so it's in a custom table - detach it
          const currentTableId = task.table_id;
          const currentOrder = task?.table_order ?? null;
          
          // Shift remaining cards in the table
          if (currentOrder !== null) {
            const remainingTasksInTable = tasks.filter(
              (t) => t.table_id === currentTableId && t.id !== taskId
            );
            
            // Shift tasks after the removed card down
            remainingTasksInTable
              .filter(t => {
                const order = t.table_order ?? 0;
                return order > currentOrder;
              })
              .forEach((t) => {
                const newOrder = (t.table_order ?? 0) - 1;
                onTaskTableChange(t.id, currentTableId, null, newOrder);
              });
          }
          
          // Fully detach: clear table_id and table_order
          onTaskTableChange(taskId, null, null, null);
        }
        // If card doesn't have table_id, it's already free-floating or in a permanent table
        // Permanent tables use kind-based association, so we don't detach those
      }

      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (err) {}
      }

      dragInfoRef.current = null;
      setDraggingId(null);
    },
    [tables, tasks, onTaskTableChange, todayStr, setPositions],
  );

  const handleDateChangeConfirm = useCallback(() => {
    if (dontRemindChecked && typeof localStorage !== 'undefined') {
      localStorage.setItem(DATE_REMIND_KEY, 'true');
    }
    if (dateChangePending && onTaskTableChange) {
      onTaskTableChange(
        dateChangePending.taskId,
        dateChangePending.tableId,
        dateChangePending.newScheduledDate,
        dateChangePending.tableOrder ?? null
      );
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
        
        // During table drag, update card positions
        if (draggingTableId && tableDragInfoRef.current) {
          const table = tables.find((t) => t.id === draggingTableId);
          if (table) {
            // Check if card is snapped to this table
            const isSnapped = (task.table_order !== null && task.table_order !== undefined) &&
                             (task.table_id === draggingTableId);
            
            if (isSnapped) {
              // For snapped cards, recompute position from current table position + layoutIndex
              // This ensures 1:1 movement with table
              position = computeSnappedPositionInTable(task.table_order, table);
            } else {
              // For non-snapped cards, use delta-based movement
              const taskTableId = getTaskTableId(task);
              if (taskTableId === draggingTableId) {
                const { tableStart } = tableDragInfoRef.current;
                const dx = table.x - tableStart.x;
                const dy = table.y - tableStart.y;
                position = { x: basePosition.x + dx, y: basePosition.y + dy };
              }
            }
          }
        }
        return (
          <TaskCard
            key={task.id}
            task={task}
            position={position}
            isDragging={draggingId === task.id}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() =>
              setExpandedTaskId((id) => (id === task.id ? null : task.id))
            }
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
