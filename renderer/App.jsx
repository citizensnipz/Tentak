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
  onDelete,
  onUpdate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const titleInputRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      titleInputRef.current?.focus();
    }
  }, [isEditing, task.title, task.description]);

  useEffect(() => {
    if (!isEditing) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
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
    if (t === task.title && desc === (task.description || null)) {
      setIsEditing(false);
      return;
    }
    onUpdate(task.id, { title: t, description: desc });
    setIsEditing(false);
  }

  function handleBlur() {
    const el = cardRef.current;
    if (!el) return;
    setTimeout(() => {
      if (!el.contains(document.activeElement)) handleSave();
    }, 0);
  }

  if (!position) return null;

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: CARD_WIDTH,
    padding: 12,
    paddingTop: 28,
    paddingBottom: 28,
    borderRadius: 12,
    border: '1px solid #d4d4d4',
    backgroundColor: '#ffffff',
    boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.18)' : '0 4px 10px rgba(0,0,0,0.12)',
    cursor: isEditing ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    userSelect: isEditing ? 'text' : 'none',
    touchAction: isEditing ? 'auto' : 'none',
    zIndex: isDragging ? 5 : 1,
    fontFamily: 'sans-serif',
    color: '#333',
    minHeight: 80,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 6,
  };

  return (
    <div
      ref={cardRef}
      className="task-card"
      onPointerDown={isEditing ? undefined : onPointerDown}
      onPointerMove={isEditing ? undefined : onPointerMove}
      onPointerUp={isEditing ? undefined : onPointerUp}
      onPointerCancel={isEditing ? undefined : onPointerCancel}
      style={cardStyle}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete(task.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 22,
          height: 22,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: '#888',
          fontSize: 16,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Delete task"
      >
        ×
      </button>
      {!isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsEditing(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: 22,
            height: 22,
            padding: 0,
            border: 'none',
            background: 'transparent',
            fontSize: 14,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Edit task"
        >
          ✏️
        </button>
      )}
      {isEditing ? (
        <>
          <input
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
            style={{
              width: '100%',
              padding: '4px 6px',
              fontSize: 16,
              fontWeight: 600,
              border: '1px solid #ccc',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Description"
            rows={2}
            style={{
              width: '100%',
              padding: '4px 6px',
              fontSize: 13,
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: 4,
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </>
      ) : (
        <>
          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
            {task.title}
          </span>
          {task.description && (
            <span style={{ fontSize: 13, color: '#666', lineHeight: 1.4 }}>
              {task.description}
            </span>
          )}
        </>
      )}
    </div>
  );
}

const NEW_TASK_POSITION = { x: 500, y: 500 };

function CreateTaskModal({ onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    onSubmit({ title: t, description: description.trim() || null })
      .then(() => onClose())
      .catch((err) => {
        setError(String(err));
        setSubmitting(false);
      });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: 360,
          padding: 24,
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #ddd',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontFamily: 'sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>New task</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Title (required)
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: 14,
                borderRadius: 6,
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: 14,
                borderRadius: 6,
                border: '1px solid #ccc',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>
          {error && (
            <div style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#f5f5f5',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                background: '#22c55e',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#22c55e',
        color: '#fff',
        fontSize: 28,
        lineHeight: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
      aria-label="Add task"
    >
      +
    </button>
  );
}

function WorldStage({ tasks, positions, setPositions, loading, error, onDelete, onUpdate }) {
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
            onDelete={onDelete}
            onUpdate={onUpdate}
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

  const [modalOpen, setModalOpen] = useState(false);

  const handleCreateTask = useCallback(({ title, description }) => {
    if (typeof window.tentak === 'undefined') {
      return Promise.reject(new Error('window.tentak not available'));
    }
    return window.tentak
      .mutate({
        operation: 'taskCreate',
        payload: {
          title,
          description,
          status: 'pending',
          kind: 'backlog',
          priority: 'normal',
        },
      })
      .then((r) => {
        if (!r.ok) throw new Error(r.error || 'Failed to create task');
        const newTask = r.data;
        setTasks((prev) => [...prev, newTask]);
        setPositions((prev) => ({ ...prev, [newTask.id]: NEW_TASK_POSITION }));
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

  const handleUpdateTask = useCallback((id, { title, description }) => {
    if (typeof window.tentak === 'undefined') return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title, description } : t
      )
    );
    window.tentak
      .mutate({ operation: 'taskUpdate', payload: { id, title, description } })
      .then((r) => {
        if (r.ok && r.data) {
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? r.data : t))
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
          loading={loading}
          error={error}
          onDelete={handleDeleteTask}
          onUpdate={handleUpdateTask}
        />
      </WorldCamera>
      <AddButton onClick={() => setModalOpen(true)} />
      {modalOpen && (
        <CreateTaskModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}
    </>
  );
}

export default App;
