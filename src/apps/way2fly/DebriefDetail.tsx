interface Marker {
  id: string;
  timestampMs: number;
  endTimestampMs: number | null;
  label: string;
  text: string | null;
  skillId: string | null;
  participantId: string | null;
}

interface DebriefDetailProps {
  debrief?: Record<string, unknown>;
  onBack: () => void;
  loading?: boolean;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function DebriefDetail({ debrief, onBack, loading }: DebriefDetailProps) {
  if (loading || !debrief) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const focus = debrief.jumpFocus as string | null;
  const summary = debrief.summaryText as string | null;
  const markers = (debrief.markers as Marker[]) || [];
  const video = debrief.video as { id: string; durationMs: number | null; is360: boolean } | null;
  const participants = (debrief.participants as Array<{ displayName: string; displayOrder: number }>) || [];
  const createdAt = debrief.createdAt as string;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-800/60 flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          ← back
        </button>
        <span className="text-xs text-zinc-600">|</span>
        <span className="text-xs font-medium text-zinc-200 truncate">
          {focus || 'Debrief'}
        </span>
        <span className="ml-auto text-[9px] text-zinc-600">
          {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Video placeholder */}
        {video && (
          <div className="relative aspect-video bg-zinc-900 rounded-lg border border-zinc-800/60 flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <span className="text-2xl">▶</span>
              <p className="text-[10px] text-zinc-500 mt-1">
                {video.durationMs ? formatTime(video.durationMs) : 'Video'}
                {video.is360 && ' · 360°'}
              </p>
            </div>
            {/* Timeline markers overlay */}
            {video.durationMs && markers.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/80">
                {markers.map((m) => {
                  const pct = (m.timestampMs / video.durationMs!) * 100;
                  return (
                    <div
                      key={m.id}
                      className="absolute top-0 w-1 h-full bg-indigo-400 rounded-full"
                      style={{ left: `${pct}%` }}
                      title={`${formatTime(m.timestampMs)} — ${m.label}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Flyers:</span>
            {participants.map((p, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {p.displayName}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800/40">
            <p className="text-[10px] text-zinc-600 mb-1">AI Summary</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Markers */}
        {markers.length > 0 && (
          <div>
            <p className="text-[10px] text-zinc-600 mb-2">
              Markers ({markers.length})
            </p>
            <div className="space-y-1">
              {markers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded bg-zinc-900/40 border border-zinc-800/30 hover:border-indigo-500/20 transition-colors"
                >
                  <span className="text-[9px] font-mono text-indigo-400 shrink-0 mt-0.5">
                    {formatTime(m.timestampMs)}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-zinc-200">{m.label}</span>
                    {m.text && (
                      <p className="text-[9px] text-zinc-500 mt-0.5">{m.text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
