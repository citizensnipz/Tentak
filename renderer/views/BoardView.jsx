import React, { useEffect } from 'react';
import WorldCamera from '../WorldCamera.jsx';
import { WorldStage } from '../components/WorldStage';
import { AddMenu } from '../components/AddMenu';
import {
  computeInitialPositionInTable,
  computeSnappedPositionInTable,
  getTaskTableId,
  minTableWidthForTasks,
} from '@/lib/board-utils';

export function BoardView({
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
  boardBackgroundColor,
  onNewTask,
  onNewTable,
  todayStr,
  cameraRef,
}) {
  useEffect(() => {
    if (tables.length === 0) return;
    setPositions((prev) => {
      const next = {};
      const tableCounts = {};
      
      tasks.forEach((task) => {
        // Check if task is snapped to a table (has table_order AND table_id)
        const hasTableOrder = task.table_order !== null && task.table_order !== undefined;
        const hasTableId = task.table_id !== null && task.table_id !== undefined;
        const isSnapped = hasTableOrder && hasTableId;
        
        if (isSnapped) {
          // Task is snapped: find table by table_id and recompute position
          const snappedTable = tables.find((t) => t.id === task.table_id);
          if (snappedTable) {
            // Always recompute position from table + order (data-driven, deterministic)
            // This ensures snapped cards move 1:1 with their table
            next[task.id] = computeSnappedPositionInTable(task.table_order, snappedTable);
          } else {
            // Table not found - keep existing position or use fallback
            if (prev[task.id]) {
              next[task.id] = prev[task.id];
            }
          }
          return;
        }
        
        // Task is not snapped - use existing logic for free-floating or kind-based cards
        const tableId = getTaskTableId(task);
        const table = tables.find((t) => t.id === tableId) || tables.find((t) => t.id === 'backlog') || tables[0];
        
        if (!table) {
          // Keep existing position if table not found
          if (prev[task.id]) {
            next[task.id] = prev[task.id];
          }
          return;
        }
        
        // Free-floating card or card in permanent table by kind (not snapped)
        if (prev[task.id]) {
          // Keep existing position
          next[task.id] = prev[task.id];
          const isPermanentTable = tableId === 'backlog' || tableId === 'today';
          if (isPermanentTable && !tableCounts[tableId]) {
            tableCounts[tableId] = 1;
          }
        } else {
          // New task: compute initial position
          const idx = tableCounts[tableId] ?? 0;
          next[task.id] = computeInitialPositionInTable(idx, table);
          tableCounts[tableId] = idx + 1;
        }
      });
      
      return next;
    });
  }, [tasks, tables, setPositions]);

  useEffect(() => {
    if (tables.length === 0) return;
    setTables((prev) => {
      const next = prev.map((table) => {
        const tasksInTable = tasks.filter((t) => t.table_id === table.id && t.table_order != null);
        const minWidth = minTableWidthForTasks(tasksInTable.length, table);
        if (table.width < minWidth) return { ...table, width: minWidth };
        return table;
      });
      const changed = next.some((t, i) => t.width !== prev[i].width);
      return changed ? next : prev;
    });
  }, [tasks, tables, setTables]);

  return (
    <>
      <WorldCamera ref={cameraRef} backgroundColor={boardBackgroundColor}>
        <WorldStage
          tasks={tasks}
          positions={positions}
          setPositions={setPositions}
          tables={tables}
          setTables={setTables}
          loading={loading}
          error={error}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onTaskTableChange={onTaskTableChange}
          onTableUpdate={onTableUpdate}
          onRequestDeleteTable={onRequestDeleteTable}
          onLockToggle={onLockToggle}
          onToggleCompletion={onToggleCompletion}
          todayStr={todayStr}
        />
      </WorldCamera>
      <AddMenu
        onNewTask={onNewTask}
        onNewTable={onNewTable}
      />
    </>
  );
}
