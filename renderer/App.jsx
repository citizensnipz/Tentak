import React, { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { NavigationDrawer } from './components/NavigationDrawer';
import { CreateTaskModal } from './components/modals/CreateTaskModal';
import { CreateTableModal } from './components/modals/CreateTableModal';
import { BoardView } from './views/BoardView';
import { DayView } from './views/DayView';
import { ChatView } from './views/ChatView';
import { ProfileView } from './views/ProfileView';
import { SettingsView } from './views/SettingsView';
import { useTaskActions } from './hooks/useTaskActions';
import { useTableActions } from './hooks/useTableActions';
import { useBoardEffects } from './hooks/useBoardEffects';
import {
  DEFAULT_TABLES,
  KIND_TO_TABLE_ID,
  BOARD_BG_COLOR_STORAGE_KEY,
  DEFAULT_BOARD_BACKGROUND_COLOR,
} from '@/lib/board-utils';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';

function App() {
  // State initialization
  const [tables, setTables] = useState(DEFAULT_TABLES);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positions, setPositions] = useState({});
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [view, setView] = useState('board');
  const [boardBackgroundColor, setBoardBackgroundColor] = useState(DEFAULT_BOARD_BACKGROUND_COLOR);
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dayTasks, setDayTasks] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState(null);
  const [initialScheduledDateForModal, setInitialScheduledDateForModal] = useState(null);
  const [deleteTablePending, setDeleteTablePending] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cameraRef = useRef(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(BOARD_BG_COLOR_STORAGE_KEY);
      if (stored) {
        setBoardBackgroundColor(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const {
    createTask,
    deleteTask,
    updateTask,
    toggleCompletion,
    changeTaskTable,
  } = useTaskActions({
    view,
    dayDate,
    tasks,
    setLoading,
    setError,
    setTasks,
    setDayLoading,
    setDayError,
    setDayTasks,
    setPositions,
  });

  const {
    createTable,
    updateTable,
    lockToggle,
    boardBackgroundColorChange,
    tableDelete,
    requestDeleteTable,
  } = useTableActions({
    tasks,
    tables,
    setTables,
    setTasks,
    setPositions,
    setDeleteTablePending,
    setBoardBackgroundColor,
  });

  useBoardEffects({ view, tables, tasks, setPositions, cameraRef });

  const handleLogout = async () => {
    await logout();
    setTasks([]);
    setDayTasks([]);
    setPositions({});
    setTables(DEFAULT_TABLES);
    setView('board');
  };

  return (
    <div
      className={cn(
        'h-screen overflow-hidden relative',
        !isAuthenticated && 'pointer-events-none select-none blur-sm'
      )}
    >
      <NavigationDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen(!drawerOpen)}
        currentView={view}
        onViewChange={setView}
        onLogout={handleLogout}
      />
      <div className="h-full min-h-0 flex flex-col ml-16" style={{ width: 'calc(100% - 64px)' }}>
        {view === 'board' && (
          <BoardView
            tasks={tasks}
            positions={positions}
            setPositions={setPositions}
            tables={tables}
            setTables={setTables}
            loading={loading}
            error={error}
            onDelete={deleteTask}
            onUpdate={updateTask}
            onTaskTableChange={changeTaskTable}
            onTableUpdate={updateTable}
            onRequestDeleteTable={requestDeleteTable}
            onLockToggle={lockToggle}
            onToggleCompletion={toggleCompletion}
            boardBackgroundColor={boardBackgroundColor}
            onNewTask={() => {
              setInitialScheduledDateForModal(null);
              setTaskModalOpen(true);
            }}
            onNewTable={() => setTableModalOpen(true)}
            todayStr={todayStr}
            cameraRef={cameraRef}
          />
        )}
        {view === 'day' && (
          <DayView
            date={dayDate}
            onDateChange={setDayDate}
            tasks={dayTasks}
            loading={dayLoading}
            error={dayError}
            onDelete={deleteTask}
            onNewTask={() => {
              setInitialScheduledDateForModal(dayDate);
              setTaskModalOpen(true);
            }}
            onToggleCompletion={toggleCompletion}
          />
        )}
        {view === 'chat' && <ChatView />}
        {view === 'profile' && <ProfileView />}
        {view === 'settings' && (
          <SettingsView
            boardBackgroundColor={boardBackgroundColor}
            onBoardBackgroundColorChange={boardBackgroundColorChange}
          />
        )}
      </div>
      {taskModalOpen && (
        <CreateTaskModal
          onClose={() => setTaskModalOpen(false)}
          onSubmit={createTask}
          initialScheduledDate={initialScheduledDateForModal}
        />
      )}
      {tableModalOpen && (
        <CreateTableModal
          onClose={() => setTableModalOpen(false)}
          onSubmit={createTable}
        />
      )}
      <AlertDialog open={!!deleteTablePending} onOpenChange={(open) => { if (!open) setDeleteTablePending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks are associated with this table. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setDeleteTablePending(null)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="secondary"
              onClick={() => {
                if (deleteTablePending) tableDelete(deleteTablePending.tableId, 'tableOnly');
              }}
            >
              Delete table only
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTablePending) tableDelete(deleteTablePending.tableId, 'tableAndTasks');
              }}
            >
              Delete table and tasks
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
