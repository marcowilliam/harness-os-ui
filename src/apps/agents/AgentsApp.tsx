import { useAgents } from '../../api/hooks';
import type { MeshAgent, AgentAccess } from '../../lib/types';

const STATUS_COLORS: Record<MeshAgent['status'], string> = {
  active:  'var(--color-active)',
  idle:    'var(--color-warning)',
  offline: 'var(--color-os-text-muted)',
};

const ACCESS_LEVEL_CONFIG: Record<AgentAccess['level'], { label: string; color: string; bg: string }> = {
  'inner-harness': { label: 'inner harness', color: 'var(--color-kernel)', bg: 'var(--color-kernel-soft)' },
  'specialized':   { label: 'specialized',   color: '#f59e0b',             bg: 'rgba(245,158,11,0.12)' },
  'external':      { label: 'external',       color: 'var(--color-os-text-muted)', bg: 'var(--color-os-panel)' },
};

function AccessBlock({ access }: { access: AgentAccess }) {
  const lvl = ACCESS_LEVEL_CONFIG[access.level];
  const readDomains = access.read.domains === '*' ? 'all domains' : (access.read.domains as string[]).join(', ') || 'none';
  const writeDomains = access.write.domains === '*' ? 'all domains' : (access.write.domains as string[]).join(', ') || 'none';
  const readConcerns = access.read.concerns === '*' ? 'all' : (access.read.concerns as string[]).join(', ') || 'none';

  return (
    <div className="space-y-2">
      {/* Access level badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: lvl.bg, color: lvl.color }}>
          {lvl.label}
        </span>
        {access.sudo.enabled && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            sudo
          </span>
        )}
        {access.read.cognitive_layer && (
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
            cortex
          </span>
        )}
      </div>

      {/* Read / Write */}
      <div className="space-y-1">
        <div className="flex gap-1.5 items-start">
          <span className="text-[9px] w-8 shrink-0 pt-0.5 font-mono" style={{ color: 'var(--color-active)' }}>read</span>
          <span className="text-[10px] leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
            {readDomains}
            {access.read.concerns !== '*' && (
              <span style={{ color: 'var(--color-os-text-muted)' }}> · {readConcerns} concerns</span>
            )}
          </span>
        </div>
        <div className="flex gap-1.5 items-start">
          <span className="text-[9px] w-8 shrink-0 pt-0.5 font-mono" style={{ color: '#f59e0b' }}>write</span>
          <span className="text-[10px]" style={{ color: 'var(--color-os-text-secondary)' }}>
            {writeDomains}
            {access.write.cognitive_layer && (
              <span style={{ color: '#a855f7' }}> + cognitive layer</span>
            )}
          </span>
        </div>
        {access.sudo.enabled && access.sudo.allowed_ops && (
          <div className="flex gap-1.5 items-start">
            <span className="text-[9px] w-8 shrink-0 pt-0.5 font-mono" style={{ color: '#ef4444' }}>sudo</span>
            <span className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
              {access.sudo.allowed_ops.join(' · ')}
              {access.sudo.requires_decision && <span> (requires decision)</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentsApp() {
  const { data: agents = [], isLoading } = useAgents();

  if (isLoading) return (
    <div className="flex items-center justify-center h-full pulse text-xs"
      style={{ color: 'var(--color-os-text-muted)' }}>
      loading agents...
    </div>
  );

  if (agents.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <span className="text-3xl opacity-20">⬡</span>
      <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
        No agents registered in this distribution
      </p>
    </div>
  );

  const byLevel = {
    'inner-harness': agents.filter((a: MeshAgent) => a.access?.level === 'inner-harness' || a.type === 'inner-harness'),
    'specialized': agents.filter((a: MeshAgent) => a.access?.level === 'specialized' || (a.type !== 'inner-harness' && a.type === 'governance')),
    'other': agents.filter((a: MeshAgent) => !a.access && a.type !== 'inner-harness' && a.type !== 'governance'),
  };

  const groups = [
    { key: 'inner-harness', label: 'Inner Harness', agents: byLevel['inner-harness'] },
    { key: 'specialized',   label: 'Specialized',   agents: byLevel['specialized'] },
    { key: 'other',         label: 'Other',          agents: byLevel['other'] },
  ].filter(g => g.agents.length > 0);

  return (
    <div className="os-scroll p-4 h-full space-y-5">
      {groups.map(group => (
        <div key={group.key}>
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider"
            style={{ color: 'var(--color-os-text-muted)' }}>
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-3 auto-rows-max">
            {group.agents.map((agent: MeshAgent) => (
              <div key={agent.slug} className="os-panel-raised p-4 rounded-xl space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-os-text)' }}>
                      {agent.name}
                    </p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-os-text-muted)' }}>
                      {agent.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: STATUS_COLORS[agent.status] }} />
                    <span className="text-[10px]" style={{ color: STATUS_COLORS[agent.status] }}>
                      {agent.status}
                    </span>
                  </div>
                </div>

                {/* Surface */}
                {agent.surface && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded inline-block"
                    style={{ background: 'var(--color-os-panel)', color: 'var(--color-os-text-muted)', border: '1px solid var(--color-os-border)' }}>
                    {agent.surface}
                  </span>
                )}

                {/* Access block */}
                {agent.access ? (
                  <AccessBlock access={agent.access} />
                ) : (
                  <span className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
                    No access config
                  </span>
                )}

                {/* Capabilities */}
                {agent.capabilities?.length > 0 && (
                  <div>
                    <p className="text-[9px] mb-1 uppercase tracking-wider" style={{ color: 'var(--color-os-text-muted)' }}>
                      Capabilities
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {agent.capabilities.map((cap: string) => (
                        <span key={cap}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--color-os-panel)', color: 'var(--color-os-text-secondary)', border: '1px solid var(--color-os-border-subtle)' }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last seen */}
                {agent.lastSeen && (
                  <p className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
                    last seen: {agent.lastSeen}
                  </p>
                )}

                {/* Notes */}
                {agent.notes && (
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
                    {agent.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
