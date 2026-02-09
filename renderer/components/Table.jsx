import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Lock, Unlock } from 'lucide-react';
import { DEFAULT_TABLE_COLOR, getTableDisplayTitle, getTextColorForBackground } from '@/lib/board-utils';

const PERMANENT_TABLE_IDS = ['backlog', 'today'];

export function Table({
  table,
  todayStr,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
  onLockToggle,
  onDeleteClick,
}) {
  const headerBg = table.color || DEFAULT_TABLE_COLOR;
  const headerTextColor = getTextColorForBackground(headerBg);
  const displayTitle = getTableDisplayTitle(table, todayStr);
  const isPermanent = PERMANENT_TABLE_IDS.includes(table.id);
  const locked = Boolean(table.locked);
  const canDrag = !locked;
  return (
    <div
      data-table-id={table.id}
      data-table-width={table.width}
      className="absolute overflow-hidden rounded-lg bg-muted font-sans z-0"
      style={{
        left: table.x,
        top: table.y,
        width: table.width,
        height: table.height,
      }}
    >
      <div
        className={cn(
          'table-header flex items-center h-9 px-3 select-none touch-none',
          canDrag ? 'cursor-grab' : 'cursor-default'
        )}
        style={{ backgroundColor: headerBg, color: headerTextColor }}
        onPointerDown={canDrag ? onHeaderPointerDown : undefined}
        onPointerMove={canDrag ? onHeaderPointerMove : undefined}
        onPointerUp={canDrag ? onHeaderPointerUp : undefined}
        onPointerCancel={canDrag ? onHeaderPointerCancel : undefined}
      >
        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{displayTitle}</span>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          {onLockToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-inherit opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onLockToggle(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={locked ? 'Unlock table' : 'Lock table'}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
          )}
          {!isPermanent && onDeleteClick && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-inherit opacity-80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onDeleteClick(table.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Delete table"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1" style={{ height: table.height - 36 }} />
    </div>
  );
}
