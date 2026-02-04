import React, { useState, useEffect, useRef, useCallback } from 'react';
import WorldCamera from './WorldCamera.jsx';

const CARD_WIDTH = 220;
const CARD_HEIGHT = 110;
const CARD_GAP = 40;
const GRID_COLUMNS = 4;
const INITIAL_OFFSET_X = 200;
const INITIAL_OFFSET_Y = 200;

function computeInitialPosition(index) {
  const col = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  return {
    x: INITIAL_OFFSET_X + col * (CARD_WIDTH + CARD_GAP),
    y: INITIAL_OFFSET_Y + row * (CARD_HEIGHT + CARD_GAP),
  };
}

function computeScale(element) {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  const base = element.offsetWidth || CARD_WIDTH;
  if (!base) return 1;
  return rect.width / base;
}

function TaskCard({
  task,
  position,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  if (!position) return null;
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: CARD_WIDTH,
        padding: 12,
        borderRadius: 12,
        border: '1px solid #d4d4d4',
        backgroundColor: '#ffffff',
        boxShadow: isDragging
          ? '0 10px 20px rgba(0,0,0,0.18)'
          : '0 4px 10px rgba(0,0,0,0.12)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: isDragging ? 5 : 1,
        fontFamily: 'sans-serif',
        color: '#333',
        minHeight: 80,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
        {task.title}
      </span>
    </div>
  );
}

function WorldStage({ tasks, positions, setPositions, loading, error }) {
  const dragInfoRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

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

      if (event.currentTarget.releasePointerCapture) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (err) {
          // Ignore release errors in unsupported environments.
        }
      }

      dragInfoRef.current = null;
      setDraggingId(null);
    },
    [],
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
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: '1px solid #dcdcdc',
            fontFamily: 'sans-serif',
            fontSize: 14,
            color: '#555',
            pointerEvents: 'none',
          }}
        >
          Loading tasks…
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: loading ? 48 : 16,
            left: 16,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: 'rgba(255,230,230,0.95)',
            border: '1px solid #f5b0b0',
            fontFamily: 'sans-serif',
            fontSize: 14,
            color: '#a00000',
            pointerEvents: 'none',
            maxWidth: 260,
          }}
        >
          {error}
        </div>
      )}
      {tasks.map((task) => {
        const position = positions[task.id];
        if (!position) return null;
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
          />
        );
      })}
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState({});

  const fetchBacklog = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.tentak === 'undefined') {
      setError('window.tentak not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    window.tentak
      .query({ type: 'tasksBacklog' })
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
    fetchBacklog();
  }, [fetchBacklog]);

  useEffect(() => {
    setPositions((prev) => {
      const next = {};
      tasks.forEach((task, index) => {
        if (prev[task.id]) {
          next[task.id] = prev[task.id];
        } else {
          next[task.id] = computeInitialPosition(index);
        }
      });
      return next;
    });
  }, [tasks]);

  return (
    <WorldCamera>
      <WorldStage
        tasks={tasks}
        positions={positions}
        setPositions={setPositions}
        loading={loading}
        error={error}
      />
    </WorldCamera>
  );
}

export default App;
