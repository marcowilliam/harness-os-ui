import { useState } from 'react';
import { useHealth } from '../../api/hooks';
import { useSessions } from '../../api/hooks';
import type { Session } from '../../lib/types';

function SessionCard({ session, onClick, selected }: {
  session: Session; onClick: () => void; selected: boolean;
}) {
  const date = session.date ? new Date(session.date).toLocaleDateString() : session.slug;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl transition-colors"
      style={{
        background: selected ? 'var(--color-kernel-soft)' : 'var(--color-os-panel-raised)',
        border: `1px solid ${selected ? 'var(--color-kernel-glow)' : 'var(--color-os-border-subtle)'}`,
      }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>
          {session.project}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
          {date}
        </span>
      </div>
      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--color-os-text-secondary)' }}>
        {session.summary}
      </p>
      <div className="flex gap-3 mt-2 text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
        {session.decisionsLogged != null && (
          <span>◈ {session.decisionsLogged} decisions</span>
        )}
        {session.learningsLogged != null && (
          <span>⚡ {session.learningsLogged} learnings</span>
        )}
        {session.toolCalls != null && (
          <span>⌥ {session.toolCalls} calls</span>
        )}
      </div>
    </button>
  );
}

export function SessionsApp() {
  const { data: health } = useHealth();
  const projects = health?.projects ?? [];
  const [activeProject, setActiveProject] = useState(projects[0] ?? '');
  const { data: sessions = [], isLoading } = useSessions(activeProject);
  const [selected, setSelected] = useState<Session | null>(null);

  return (
    <div className="flex h-full text-sm">
      {/* Project sidebar */}
      <div className="w-40 shrink-0 border-r p-2 space-y-0.5"
        style={{ borderColor: 'var(--color-os-border-subtle)', background: 'var(--color-os-bg)' }}>
        {projects.map(p => (
          <button key={p}
            onClick={() => { setActiveProject(p); setSelected(null); }}
            className="w-full text-left px-2 py-1.5 rounded-lg text-xs"
            style={{
              background: activeProject === p ? 'var(--color-kernel-soft)' : 'transparent',
              color: activeProject === p ? 'var(--color-kernel)' : 'var(--color-os-text-secondary)',
            }}>
            {p}
          </button>
        ))}
        {projects.length === 0 && (
          <p className="text-[10px] px-2" style={{ color: 'var(--color-os-text-muted)' }}>
            No projects found
          </p>
        )}
      </div>

      {/* Session list */}
      <div className="w-64 shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}>
        <div className="p-2 border-b text-xs font-medium"
          style={{ borderColor: 'var(--color-os-border-subtle)', color: 'var(--color-os-text-muted)' }}>
          {sessions.length} sessions
        </div>
        <div className="flex-1 os-scroll p-2 space-y-1.5">
          {isLoading ? (
            <p className="text-xs text-center p-4 pulse" style={{ color: 'var(--color-os-text-muted)' }}>
              loading...
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-center p-4" style={{ color: 'var(--color-os-text-muted)' }}>
              No sessions yet
            </p>
          ) : (
            [...sessions].reverse().map(s => (
              <SessionCard
                key={s.slug}
                session={s}
                selected={selected?.slug === s.slug}
                onClick={() => setSelected(s)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 os-scroll p-4">
        {selected ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-os-text)' }}>
                {selected.project}
              </h2>
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
                {selected.date}
              </p>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
              {selected.summary}
            </p>

            {selected.workCompleted?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-active)' }}>
                  Work completed
                </h3>
                <ul className="space-y-1">
                  {selected.workCompleted.map((w, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--color-os-text-secondary)' }}>
                      <span style={{ color: 'var(--color-active)' }}>✓</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.nextSteps?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-kernel)' }}>
                  Next steps
                </h3>
                <ul className="space-y-1">
                  {selected.nextSteps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--color-os-text-secondary)' }}>
                      <span style={{ color: 'var(--color-kernel)' }}>›</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.openQuestions && selected.openQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-warning)' }}>
                  Open questions
                </h3>
                <ul className="space-y-1">
                  {selected.openQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--color-os-text-secondary)' }}>
                      <span style={{ color: 'var(--color-warning)' }}>?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
              Select a session to view its handoff
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
