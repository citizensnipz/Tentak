import { DEFAULT_TASK_COLOR } from '@/lib/board-utils';

export function ColorPicker({ value, onChange }) {
  return (
    <input
      type="color"
      value={value || DEFAULT_TASK_COLOR}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-9 cursor-pointer rounded border border-border p-0.5"
      aria-label="Choose color"
    />
  );
}
