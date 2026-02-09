import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { DEFAULT_BOARD_BACKGROUND_COLOR } from '@/lib/board-utils';

export function SettingsView({ boardBackgroundColor, onBoardBackgroundColorChange }) {
  const [localColor, setLocalColor] = useState(boardBackgroundColor || DEFAULT_BOARD_BACKGROUND_COLOR);

  useEffect(() => {
    setLocalColor(boardBackgroundColor || DEFAULT_BOARD_BACKGROUND_COLOR);
  }, [boardBackgroundColor]);

  function handleChange(e) {
    const value = e.target.value;
    setLocalColor(value);
    if (onBoardBackgroundColorChange) {
      onBoardBackgroundColorChange(value);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customize how your board looks.
        </p>
        <div className="flex items-center gap-4">
          <Label htmlFor="board-bg-color" className="text-sm font-medium">
            Board background color
          </Label>
          <input
            id="board-bg-color"
            type="color"
            value={localColor}
            onChange={handleChange}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
          />
          <span className="text-xs font-mono text-muted-foreground">
            {localColor}
          </span>
        </div>
      </div>
    </div>
  );
}
