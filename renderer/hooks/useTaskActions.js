import { useCallback, useEffect } from 'react';
import { TABLE_ID_TO_KIND } from '@/lib/board-utils';

export function useTaskActions({
  view,
  dayDate,
  setLoading,
  setError,
  setTasks,
  setDayLoading,
  setDayError,
  setDayTasks,
  setPositions,
}) {
  // Load all tasks on mount
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
  }, [setError, setLoading, setTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Load tasks for the current day in Day view
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
  }, [dayDate, setDayError, setDayLoading, setDayTasks]);

  useEffect(() => {
    if (view === 'day') fetchDayTasks();
  }, [view, fetchDayTasks]);

  const createTask = useCallback(
    ({ title, description, color, scheduled_date }) => {
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
    },
    [dayDate, setDayTasks, setTasks, view],
  );

  const deleteTask = useCallback(
    (id) => {
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
    },
    [setDayTasks, setPositions, setTasks],
  );

  const updateTask = useCallback(
    (id, updates) => {
      if (typeof window.tentak === 'undefined') return;
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      window.tentak
        .mutate({ operation: 'taskUpdate', payload: { id, ...updates } })
        .then((r) => {
          if (r.ok && r.data) {
            setTasks((prev) => prev.map((t) => (t.id === id ? r.data : t)));
            if (view === 'day') {
              setDayTasks((prev) => {
                const next = prev.filter((t) => t.id !== id);
                if ((r.data.scheduled_date || '') === dayDate) next.push(r.data);
                return next;
              });
            }
          }
        });
    },
    [dayDate, setDayTasks, setTasks, view],
  );

  const toggleCompletion = useCallback(
    (id, completed) => {
      updateTask(id, { status: completed ? 'completed' : 'pending' });
    },
    [updateTask],
  );

  const changeTaskTable = useCallback(
    (id, tableId, newScheduledDate = null, tableOrder = null) => {
      const kind = TABLE_ID_TO_KIND[tableId];
      const updates = { scheduled_date: newScheduledDate };
      
      // If tableId is null, fully detach (clear everything)
      if (tableId === null) {
        updates.table_id = null;
        updates.table_order = null;
        // Don't change kind - keep existing kind
        updateTask(id, updates);
        return;
      }
      
      if (kind) {
        // Permanent table (backlog/today): set kind AND table_id for snapping
        // This allows snapping while maintaining kind-based association
        updates.kind = kind;
        updates.table_id = tableId; // Set table_id for snapping (all tables behave the same)
        updates.table_order = tableOrder; // All tables can use table_order for snapping
      } else {
        // Custom table: set table_id and table_order
        updates.table_id = tableId;
        updates.table_order = tableOrder;
      }
      
      updateTask(id, updates);
    },
    [updateTask],
  );

  return {
    createTask,
    deleteTask,
    updateTask,
    toggleCompletion,
    changeTaskTable,
  };
}

