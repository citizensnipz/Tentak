import { useCallback, useEffect, useRef } from 'react';
import { computeInitialPositionInTable, getTaskTableId } from '@/lib/board-utils';

export function useBoardEffects({ view, tables, tasks, setPositions, cameraRef }) {
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
  }, [cameraRef, tables]);

  const prevViewRef = useRef(view);

  useEffect(() => {
    if (prevViewRef.current !== 'board' && view === 'board') {
      centerOnToday();
    }
    prevViewRef.current = view;
  }, [centerOnToday, view]);

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
          const tableId = getTaskTableId(task);
          const table =
            tables.find((t) => t.id === tableId) ||
            tables.find((t) => t.id === 'backlog') ||
            tables[0];
          if (table) {
            const idx = tableCounts[tableId] ?? 0;
            next[task.id] = computeInitialPositionInTable(idx, table);
            tableCounts[tableId] = idx + 1;
          }
        }
      });
      return next;
    });
  }, [setPositions, tasks, tables]);
}

