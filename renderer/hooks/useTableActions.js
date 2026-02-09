import { useCallback, useEffect } from 'react';
import {
  DEFAULT_TABLES,
  DEFAULT_TABLE_COLOR,
  NEW_TABLE_CENTER_X,
  NEW_TABLE_CENTER_Y,
  DEFAULT_TABLE_WIDTH,
  DEFAULT_TABLE_HEIGHT,
  BOARD_BG_COLOR_STORAGE_KEY,
} from '@/lib/board-utils';

export function useTableActions({
  tasks,
  tables,
  setTables,
  setTasks,
  setPositions,
  setDeleteTablePending,
  setBoardBackgroundColor,
}) {
  // Load tables from the database and merge with defaults
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
  }, [setTables]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const createTable = useCallback(
    ({ name, color, table_date }) => {
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
    },
    [setTables],
  );

  const updateTable = useCallback(
    (id, updates) => {
      if (typeof window.tentak === 'undefined') return;
      window.tentak
        .mutate({ operation: 'tableUpdate', payload: { id, ...updates } })
        .then((r) => {
          if (r.ok && r.data) {
            setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
          }
        });
    },
    [setTables],
  );

  const lockToggle = useCallback(
    (tableId) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;
      updateTable(tableId, { locked: !table.locked });
    },
    [tables, updateTable],
  );

  const boardBackgroundColorChange = useCallback(
    (color) => {
      setBoardBackgroundColor(color);
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(BOARD_BG_COLOR_STORAGE_KEY, color);
      } catch {
        // ignore storage errors
      }
    },
    [setBoardBackgroundColor],
  );

  const tableDelete = useCallback(
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
                  t.table_id === tableId ? { ...t, table_id: null, kind: 'backlog', table_order: null } : t,
                ),
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
    [setDeleteTablePending, setPositions, setTables, setTasks, tasks],
  );

  const requestDeleteTable = useCallback(
    (tableId) => {
      const taskCount = tasks.filter((t) => t.table_id === tableId).length;
      if (taskCount === 0) {
        tableDelete(tableId, 'immediate');
      } else {
        setDeleteTablePending({ tableId, taskCount });
      }
    },
    [setDeleteTablePending, tableDelete, tasks],
  );

  return {
    createTable,
    updateTable,
    lockToggle,
    boardBackgroundColorChange,
    tableDelete,
    requestDeleteTable,
  };
}

