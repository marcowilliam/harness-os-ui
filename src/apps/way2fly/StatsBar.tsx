interface StatsBarProps {
  stats?: Record<string, unknown>;
  loading?: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading) {
    return (
      <div className="px-4 py-2 border-b border-zinc-800/60 flex gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const totalDebriefs = (stats.totalDebriefs as number) || 0;
  const totalMarkers = (stats.totalMarkers as number) || 0;
  const disciplines = (stats.disciplines as Array<{ id: string; debriefCount: number }>) || [];
  const lastDebrief = stats.lastDebrief as { date: string; focus: string | null } | null;

  return (
    <div className="px-4 py-2 border-b border-zinc-800/60 flex items-center gap-4 text-[10px] text-zinc-400">
      <div className="flex items-center gap-1">
        <span className="text-indigo-400 font-medium">{totalDebriefs}</span>
        <span>debriefs</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-amber-400 font-medium">{totalMarkers}</span>
        <span>markers</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-emerald-400 font-medium">{disciplines.length}</span>
        <span>disciplines</span>
      </div>
      {lastDebrief && (
        <div className="ml-auto text-zinc-600">
          Last: {new Date(lastDebrief.date).toLocaleDateString()}
          {lastDebrief.focus && <span className="ml-1 text-zinc-500">· {lastDebrief.focus}</span>}
        </div>
      )}
    </div>
  );
}
