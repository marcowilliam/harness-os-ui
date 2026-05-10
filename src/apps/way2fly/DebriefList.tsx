interface DebriefListProps {
  debriefs: Array<Record<string, unknown>>;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function DebriefList({ debriefs, onSelect, loading }: DebriefListProps) {
  if (loading && debriefs.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {debriefs.map((debrief) => {
        const id = debrief.id as string;
        const focus = debrief.jumpFocus as string | null;
        const summary = debrief.summaryText as string | null;
        const status = debrief.status as string;
        const createdAt = debrief.createdAt as string;
        const skillIds = (debrief.skillIds as string[]) || [];

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="w-full text-left px-3 py-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/40 hover:border-indigo-500/30 transition-all group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {focus || 'Untitled debrief'}
                  </span>
                  {status === 'shared' && (
                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      shared
                    </span>
                  )}
                </div>
                {summary && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{summary}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[9px] text-zinc-600">
                  {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {skillIds.length > 0 && (
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    {skillIds.length} skill{skillIds.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
