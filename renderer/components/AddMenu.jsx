import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, ClipboardList, Plus } from 'lucide-react';

export function AddMenu({ onNewTask, onNewTable }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  function handleNewTask() {
    setOpen(false);
    onNewTask();
  }

  function handleNewTable() {
    setOpen(false);
    onNewTable();
  }

  const fabClass = 'h-14 w-14 rounded-full text-xl shadow-md';

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {open && (
        <>
          <Button
            type="button"
            className={`${fabClass} bg-blue-500 hover:bg-blue-600`}
            onClick={handleNewTable}
            aria-label="New table"
            title="New table"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className={`${fabClass} bg-green-600 hover:bg-green-700`}
            onClick={handleNewTask}
            aria-label="New task"
            title="New task"
          >
            <ClipboardList className="h-5 w-5" />
          </Button>
        </>
      )}
      <Button
        type="button"
        className={`${fabClass} bg-green-600 hover:bg-green-700`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open add menu'}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
