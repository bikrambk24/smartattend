interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-xl border border-dashed border-slate-200">
      <svg width="32" height="32" viewBox="0 0 28 28" aria-hidden="true" className="mb-3">
        <circle cx="14" cy="14" r="12" fill="none" stroke="#0EA5A0" strokeWidth="1.5" opacity="0.2" />
        <circle cx="14" cy="14" r="8" fill="none" stroke="#0EA5A0" strokeWidth="1.5" opacity="0.35" />
        <circle cx="14" cy="14" r="3.5" fill="#0EA5A0" opacity="0.5" />
      </svg>
      <h3 className="text-sm font-medium text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm bg-teal text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-dark"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}