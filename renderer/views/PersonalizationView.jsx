import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ColorPicker } from '@/components/ColorPicker';
import { DEFAULT_TASK_COLOR } from '@/lib/board-utils';
import { Plus, Pencil, Trash2, Palette } from 'lucide-react';

export function PersonalizationView() {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState(DEFAULT_TASK_COLOR);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [tagEditId, setTagEditId] = useState(null);
  const [tagName, setTagName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = () => {
    if (typeof window?.tentak === 'undefined') return;
    setLoading(true);
    setError(null);
    Promise.all([
      window.tentak.query({ type: 'categoriesByUser' }),
      window.tentak.query({ type: 'tagsByUser' }),
    ])
      .then(([catRes, tagRes]) => {
        if (catRes.ok) setCategories(catRes.data ?? []);
        else setError(catRes.error);
        if (tagRes.ok) setTags(tagRes.data ?? []);
        else setError(tagRes.error);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateCategory() {
    setCategoryEditId(null);
    setCategoryName('');
    setCategoryColor(DEFAULT_TASK_COLOR);
    setCategoryModalOpen(true);
  }

  function openEditCategory(cat) {
    setCategoryEditId(cat.id);
    setCategoryName(cat.name);
    setCategoryColor(cat.color || DEFAULT_TASK_COLOR);
    setCategoryModalOpen(true);
  }

  function handleSaveCategory() {
    const name = categoryName.trim();
    if (!name) return;
    const payload = categoryEditId
      ? { operation: 'categoryUpdate', payload: { id: categoryEditId, name, color: categoryColor } }
      : { operation: 'categoryCreate', payload: { name, color: categoryColor } };
    window.tentak.mutate(payload).then((r) => {
      if (r.ok) {
        setCategoryModalOpen(false);
        fetchData();
      } else {
        setError(r.error);
      }
    });
  }

  function openCreateTag() {
    setTagEditId(null);
    setTagName('');
    setTagModalOpen(true);
  }

  function openEditTag(tag) {
    setTagEditId(tag.id);
    setTagName(tag.name);
    setTagModalOpen(true);
  }

  function handleSaveTag() {
    const name = tagName.trim();
    if (!name) return;
    const payload = tagEditId
      ? { operation: 'tagUpdate', payload: { id: tagEditId, name } }
      : { operation: 'tagCreate', payload: { name } };
    window.tentak.mutate(payload).then((r) => {
      if (r.ok) {
        setTagModalOpen(false);
        fetchData();
      } else {
        setError(r.error);
      }
    });
  }

  function handleDeleteCategory(id) {
    window.tentak.mutate({ operation: 'categoryDelete', payload: { id } }).then((r) => {
      if (r.ok) {
        setDeleteTarget(null);
        fetchData();
      } else {
        setError(r.error);
      }
    });
  }

  function handleDeleteTag(id) {
    window.tentak.mutate({ operation: 'tagDelete', payload: { id } }).then((r) => {
      if (r.ok) {
        setDeleteTarget(null);
        fetchData();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 space-y-6 overflow-y-auto">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Categories
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Macro-level grouping for tasks. One category per task.
        </p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <div
                className="h-6 w-6 rounded shrink-0 border border-border"
                style={{ backgroundColor: cat.color || DEFAULT_TASK_COLOR }}
                aria-hidden
              />
              <span className="flex-1 font-medium text-sm">{cat.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditCategory(cat)}
                aria-label="Edit category"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}
                aria-label="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={openCreateCategory} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create new category
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Tags</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Micro-level labels. Many tags per task.
        </p>
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <span className="flex-1 font-medium text-sm">{tag.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEditTag(tag)}
                aria-label="Edit tag"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget({ type: 'tag', id: tag.id, name: tag.name })}
                aria-label="Delete tag"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={openCreateTag} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create new tag
          </Button>
        </div>
      </section>

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{categoryEditId ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={categoryColor} onChange={setCategoryColor} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCategory} disabled={!categoryName.trim()}>
              {categoryEditId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{tagEditId ? 'Edit tag' : 'New tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Tag name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTagModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveTag} disabled={!tagName.trim()}>
              {tagEditId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'category' ? 'category' : 'tag'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'category'
                ? `Tasks using "${deleteTarget?.name}" will have their category cleared. This cannot be undone.`
                : `"${deleteTarget?.name}" will be removed from all tasks. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.type === 'category') handleDeleteCategory(deleteTarget.id);
                else if (deleteTarget?.type === 'tag') handleDeleteTag(deleteTarget.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
