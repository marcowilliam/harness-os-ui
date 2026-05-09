import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useHealth } from '../api/hooks';

function useClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 15_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export function Tray() {
  const wsConnected    = useStore((s) => s.wsConnected);
  const distName       = useStore((s) => s.distributionName);
  const activeProject  = useStore((s) => s.activeProject);
  const sessionTokens  = useStore((s) => s.sessionTokens);
  const sessionLearnings = useStore((s) => s.sessionLearnings);
  const { data: health } = useHealth();
  const time = useClock();

  const project = activeProject ?? health?.projects?.[0] ?? null;
  const formatTokens = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div
      className="os-glass flex items-center gap-3 px-4 h-9 shrink-0 z-50 select-none"
      style={{ borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderRadius: 0 }}
    >
      {/* ── Left zone ─────────────────────────────────── */}
      <div className="flex items-center gap-2.5 shrink-0">

        {/* Distribution badge */}
        <span className="os-tray-badge">
          {distName || 'harness.os'}
        </span>

        {/* Active project */}
        {project && (
          <>
            <span style={{ color: 'var(--color-os-text-muted)', fontSize: 10 }}>›</span>
            <span className="os-tray-item font-mono" style={{ color: 'var(--color-os-text-secondary)', fontSize: 11 }}>
              {project}
            </span>
          </>
        )}
      </div>

      <div className="os-tray-sep" />

      {/* ── Center zone (cognitive metrics) ────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {health && (
          <span className="os-tray-item">
            <span style={{ color: 'var(--color-os-text-muted)' }}>◈</span>
            {health.counts.knowledge}
            <span style={{ color: 'var(--color-os-text-muted)', marginLeft: 1 }}>chunks</span>
          </span>
        )}

        {sessionLearnings > 0 && (
          <span className="os-tray-item">
            <span style={{ color: 'var(--color-cortex)' }}>⚡</span>
            <span style={{ color: 'var(--color-cortex)' }}>
              {sessionLearnings} {sessionLearnings === 1 ? 'learning' : 'learnings'}
            </span>
          </span>
        )}

        {sessionTokens > 0 && (
          <span className="os-tray-item font-mono">
            <span style={{ color: 'var(--color-os-text-muted)' }}>◉</span>
            {formatTokens(sessionTokens)}
          </span>
        )}
      </div>

      {/* ── Spacer ────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right zone ────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Scale tier */}
        <span className="os-tray-item font-mono">
          <span style={{ color: 'var(--color-os-text-muted)' }}>S1</span>
        </span>

        <div className="os-tray-sep" />

        {/* Connection */}
        <div className="flex items-center gap-1.5 os-tray-item">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: wsConnected ? 'var(--color-active)' : 'var(--color-error)',
              boxShadow: wsConnected ? '0 0 5px var(--color-active)' : 'none',
            }}
          />
          <span style={{ color: wsConnected ? 'var(--color-active)' : 'var(--color-error)' }}>
            {wsConnected ? 'live' : 'offline'}
          </span>
        </div>

        <div className="os-tray-sep" />

        {/* Clock */}
        <span className="os-tray-item font-mono" style={{ fontSize: 11, color: 'var(--color-os-text-secondary)' }}>
          {time}
        </span>
      </div>
    </div>
  );
}
