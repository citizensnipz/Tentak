import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { DEFAULT_TABLE_COLOR } from '@/lib/board-utils';

export function CreateTableModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [tableDate, setTableDate] = useState('');
  const [color, setColor] = useState(DEFAULT_TABLE_COLOR);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = name.trim();
    const date = tableDate.trim() || null;
    
    // Validation: if no date, title is required
    if (!date && !t) {
      setError('Table name is required when no date is provided');
      return;
    }
    
    setError(null);
    onSubmit({ name: t, color: color || DEFAULT_TABLE_COLOR, table_date: date });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>New table</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-name">
              Table name {!tableDate.trim() && '(required)'}
            </Label>
            <Input
              id="table-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Table name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="table-date">Date (optional)</Label>
            <Input
              id="table-date"
              type="date"
              value={tableDate}
              onChange={(e) => setTableDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error && (
            <div className="text-destructive text-sm mb-2">{error}</div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
