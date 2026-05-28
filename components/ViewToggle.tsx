'use client';

export type ViewMode = 'grid' | 'list';

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewToggle({ value, onChange }: Props) {
  const handleSelect = (next: ViewMode) => {
    if (next !== value) onChange(next);
  };
  return (
    <div className="view-toggle" role="group" aria-label="View">
      <button
        type="button"
        className="view-toggle__button"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        onClick={() => handleSelect('grid')}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className="view-toggle__button"
        aria-label="List view"
        aria-pressed={value === 'list'}
        onClick={() => handleSelect('list')}
      >
        <ListIcon />
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <rect x="1" y="1" width="6" height="6" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <rect x="1" y="2" width="14" height="2" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" fill="currentColor" />
      <rect x="1" y="12" width="14" height="2" fill="currentColor" />
    </svg>
  );
}
