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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '../ColorPicker';
import { DEFAULT_TASK_COLOR } from '@/lib/board-utils';

export function CreateTaskModal({ onClose, onSubmit, initialScheduledDate = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_TASK_COLOR);
  const [scheduledDate, setScheduledDate] = useState(initialScheduledDate || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialScheduledDate) setScheduledDate(initialScheduledDate);
  }, [initialScheduledDate]);

  function handleSubmit(e) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError('Title is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    const sched = scheduledDate.trim() || null;
    onSubmit({ title: t, description: description.trim() || null, color: color || null, scheduled_date: sched })
      .then(() => onClose())
      .catch((err) => {
        setError(String(err));
        setSubmitting(false);
      });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[360px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title (required)</Label>
            <Input
              id="task-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-scheduled-date">Scheduled date (optional)</Label>
            <Input
              id="task-scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-destructive text-sm mb-2">{error}</div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
