import { useStore } from '../store';
import type { OsEvent } from '../lib/types';

const EVENT_ICONS: Record<OsEvent['type'], string> = {
  'learning-logged':  '⚡',
  'decision-logged':  '◈',
  'session-started':  '▶',
  'session-ended':    '■',
  'file-changed':     '⟳',
  'sync-complete':    '⬡',
};

const EVENT_COLORS: Record<OsEvent['type'], string> = {
  'learning-logged':  'var(--color-cortex)',
  'decision-logged':  'var(--color-kernel)',
  'session-started':  'var(--color-active)',
  'session-ended':    'var(--color-os-text-secondary)',
  'file-changed':     'var(--color-warning)',
  'sync-complete':    'var(--color-active)',
};

function eventTitle(e: OsEvent): string {
  switch (e.type) {
    case 'learning-logged':  return e.title  ? `Learning: ${e.title}`          : 'New learning logged';
    case 'decision-logged':  return e.title  ? `Decision: ${e.title}`          : 'Decision logged';
    case 'session-started':  return e.project ? `Session started — ${e.project}` : 'Session started';
    case 'session-ended':    return e.project ? `Handoff ready — ${e.project}`   : 'Session ended';
    case 'file-changed':     return 'Knowledge file updated';
    case 'sync-complete':    return e.count  ? `Sync complete — ${e.count} items` : 'Cognitive sync complete';
  }
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function Notifications() {
  const notifications    = useStore((s) => s.notifications);
  const clearNotification = useStore((s) => s.clearNotification);

  if (notifications.length === 0) return null;

  const visible = notifications.slice(0, 4);

  return (
    <div className="absolute top-11 right-3 z-50 flex flex-col gap-1.5 w-72">
      {/* Dismiss all (when multiple) */}
      {visible.length > 1 && (
        <div className="flex justify-end pr-1">
          <button
            onClick={() => { for (let i = visible.length - 1; i >= 0; i--) clearNotification(i); }}
            className="text-[10px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-os-text-muted)' }}
          >
            dismiss all
          </button>
        </div>
      )}

      {visible.map((n, i) => (
        <div
          key={i}
          className="os-glass-subtle rounded-xl px-3 py-2.5 flex items-start gap-2.5 fade-up"
          style={{
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            borderLeft: `2px solid ${EVENT_COLORS[n.type]}`,
          }}
        >
          <span
            className="text-sm leading-none mt-0.5 shrink-0"
            style={{ color: EVENT_COLORS[n.type] }}
          >
            {EVENT_ICONS[n.type]}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-xs leading-snug truncate" style={{ color: 'var(--color-os-text)' }}>
              {eventTitle(n)}
            </p>
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
              {timeAgo(n.timestamp)}
            </p>
          </div>

          <button
            onClick={() => clearNotification(i)}
            className="shrink-0 text-[10px] leading-none mt-0.5 hover:opacity-60 transition-opacity"
            style={{ color: 'var(--color-os-text-muted)' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
