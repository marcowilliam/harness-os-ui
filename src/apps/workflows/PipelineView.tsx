interface Phase {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

const PHASE_ICONS: Record<string, string> = {
  parse: '◇',
  plan: '△',
  build: '⚡',
  test: '◈',
  fix: '⊘',
  improve: '○',
  deploy: '◉',
};

export function PipelineView({ phases, currentPhase }: { phases: Phase[]; currentPhase: string }) {
  return (
    <div className="flex items-center gap-0.5 px-4 py-3 overflow-x-auto">
      {phases.map((phase, i) => {
        const isActive = phase.name === currentPhase;
        const isDone = phase.status === 'done';
        const isError = phase.status === 'error';
        const icon = PHASE_ICONS[phase.name] ?? '○';

        const color = isError
          ? 'var(--color-error)'
          : isDone
            ? 'var(--color-active)'
            : isActive
              ? 'var(--color-kernel)'
              : 'var(--color-os-text-muted)';

        return (
          <div key={phase.name} className="flex items-center gap-0.5 shrink-0">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                background: isActive
                  ? 'var(--color-kernel-soft)'
                  : isDone
                    ? 'rgba(16,185,129,0.06)'
                    : isError
                      ? 'rgba(239,68,68,0.06)'
                      : 'transparent',
                border: `1px solid ${isActive ? 'var(--color-kernel-glow)' : 'transparent'}`,
              }}
            >
              {isActive && (
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                  style={{ background: 'var(--color-kernel)' }}
                />
              )}
              <span className="text-[11px]" style={{ color }}>{icon}</span>
              <span className="text-[11px] font-medium capitalize" style={{ color }}>
                {phase.name}
              </span>
              {isDone && <span className="text-[10px]" style={{ color }}>✓</span>}
              {isError && <span className="text-[10px]" style={{ color }}>✕</span>}
            </div>
            {i < phases.length - 1 && (
              <div
                className="w-3 h-px shrink-0"
                style={{ background: isDone ? 'var(--color-active)' : 'var(--color-os-border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
