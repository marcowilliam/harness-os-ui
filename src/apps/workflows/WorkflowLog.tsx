import { useRef, useEffect } from 'react';

interface LogEntry {
  phase: string;
  text: string;
}

export function WorkflowLog({ logs, isRunning }: { logs: LogEntry[]; isRunning: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(false);

  useEffect(() => {
    if (!userScrolled.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolled.current = !atBottom;
  };

  if (logs.length === 0 && !isRunning) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[11px]" style={{ color: 'var(--color-os-text-muted)' }}>
          No logs yet. Trigger a workflow to see output here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto os-scroll p-3 font-mono text-[11px] leading-relaxed"
      style={{ background: 'rgba(0,0,0,0.2)' }}
    >
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2" style={{ wordBreak: 'break-word' }}>
          <span
            className="shrink-0 w-14 text-right capitalize"
            style={{ color: 'var(--color-os-text-muted)', opacity: 0.6 }}
          >
            {log.phase}
          </span>
          <span style={{ color: 'var(--color-os-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {log.text}
          </span>
        </div>
      ))}
      {isRunning && (
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-kernel)' }}
          />
          <span style={{ color: 'var(--color-os-text-muted)' }}>Agent working...</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
