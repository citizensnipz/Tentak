import React, { useEffect } from 'react';
import WorldCamera from '../WorldCamera.jsx';
import { WorldStage } from '../components/WorldStage';
import { AddMenu } from '../components/AddMenu';
import { computeInitialPositionInTable, getTaskTableId } from '@/lib/board-utils';

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
        if (prev[task.id]) {
          next[task.id] = prev[task.id];
        } else {
          const tableId = getTaskTableId(task);
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
  }, [tasks, tables, setPositions]);

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
