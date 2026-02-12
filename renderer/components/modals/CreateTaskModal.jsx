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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from '../ColorPicker';
import { DEFAULT_TASK_COLOR } from '@/lib/board-utils';
import { ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CreateTaskModal({ onClose, onSubmit, initialScheduledDate = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_TASK_COLOR);
  const [scheduledDate, setScheduledDate] = useState(initialScheduledDate || '');
  const [categoryId, setCategoryId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [createCategoryMode, setCreateCategoryMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_TASK_COLOR);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [createTagMode, setCreateTagMode] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialScheduledDate) setScheduledDate(initialScheduledDate);
  }, [initialScheduledDate]);

  useEffect(() => {
    if (typeof window?.tentak === 'undefined') return;
    window.tentak.query({ type: 'categoriesByUser' }).then((r) => {
      if (r.ok) setCategories(r.data ?? []);
    });
    window.tentak.query({ type: 'tagsByUser' }).then((r) => {
      if (r.ok) setTags(r.data ?? []);
    });
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedTags = tags.filter((t) => selectedTagIds.has(t.id));
  const filteredTags = tagSearch.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    window.tentak
      .mutate({ operation: 'categoryCreate', payload: { name, color: newCategoryColor } })
      .then((r) => {
        if (r.ok && r.data) {
          setCategories((prev) => [...prev, r.data]);
          setCategoryId(r.data.id);
          setCreateCategoryMode(false);
          setNewCategoryName('');
          setNewCategoryColor(DEFAULT_TASK_COLOR);
          setCategoryPopoverOpen(false);
        }
      })
      .finally(() => setCreatingCategory(false));
  }

  function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    window.tentak
      .mutate({ operation: 'tagCreate', payload: { name } })
      .then((r) => {
        if (r.ok && r.data) {
          setTags((prev) => [...prev, r.data]);
          setSelectedTagIds((prev) => new Set([...prev, r.data.id]));
          setCreateTagMode(false);
          setNewTagName('');
          setTagSearch('');
          setTagPopoverOpen(false);
        }
      });
  }

  function toggleTag(id) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
    onSubmit({
      title: t,
      description: description.trim() || null,
      color: color || null,
      scheduled_date: sched,
      category_id: categoryId ?? null,
      tag_ids: [...selectedTagIds],
    })
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
            <Label>Category</Label>
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  <span className="flex items-center gap-2 truncate">
                    {selectedCategory ? (
                      <>
                        <span
                          className="h-4 w-4 rounded shrink-0 border border-border"
                          style={{ backgroundColor: selectedCategory.color || DEFAULT_TASK_COLOR }}
                        />
                        {selectedCategory.name}
                      </>
                    ) : (
                      'No Category'
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                {createCategoryMode ? (
                  <div className="p-3 space-y-3">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <ColorPicker value={newCategoryColor} onChange={setNewCategoryColor} />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreateCategoryMode(false);
                          setNewCategoryName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || creatingCategory}
                      >
                        {creatingCategory ? 'Creating…' : 'Create'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => {
                        setCategoryId(null);
                        setCategoryPopoverOpen(false);
                      }}
                    >
                      No Category
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setCategoryPopoverOpen(false);
                        }}
                      >
                        <span
                          className="h-4 w-4 rounded shrink-0 border border-border"
                          style={{ backgroundColor: cat.color || DEFAULT_TASK_COLOR }}
                        />
                        {cat.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1"
                      onClick={() => setCreateCategoryMode(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create new category
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal min-h-9"
                >
                  <span className="flex flex-wrap gap-1">
                    {selectedTags.length > 0 ? (
                      selectedTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tag.id);
                            }}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Select tags…</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                {createTagMode ? (
                  <div className="p-3 flex gap-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                    >
                      Create
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreateTagMode(false);
                        setNewTagName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="py-1 max-h-48 overflow-y-auto">
                    <Input
                      placeholder="Search tags…"
                      value={tagSearch}
                      onChange={(e) => setTagSearch(e.target.value)}
                      className="mx-2 mb-2 h-8"
                    />
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                          selectedTagIds.has(tag.id) && 'bg-accent'
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span
                          className={cn(
                            'h-4 w-4 rounded border shrink-0',
                            selectedTagIds.has(tag.id)
                              ? 'bg-primary border-primary'
                              : 'border-border'
                          )}
                        />
                        {tag.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1"
                      onClick={() => setCreateTagMode(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Create new tag
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Color (fallback when no category)</Label>
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
