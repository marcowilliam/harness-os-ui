import { useHealth } from '../../api/hooks';
import { useStore } from '../../store';

export function SettingsApp() {
  const { data: health } = useHealth();
  const distributionName = useStore((s) => s.distributionName);
  const wsConnected = useStore((s) => s.wsConnected);

  const sections = [
    {
      title: 'Distribution',
      items: [
        { label: 'Name', value: distributionName },
        { label: 'Kernel', value: 'harness.os' },
        { label: 'Status', value: health?.status ?? '—', accent: true },
        { label: 'Projects', value: (health?.projects ?? []).join(', ') || '—' },
      ],
    },
    {
      title: 'Knowledge',
      items: [
        { label: 'Total chunks', value: String(health?.counts.knowledge ?? 0) },
        { label: 'Rules', value: String(health?.counts.rules ?? 0) },
        { label: 'Workflows', value: String(health?.counts.workflows ?? 0) },
        { label: 'Learnings', value: String(health?.counts.learnings ?? 0) },
        { label: 'Decisions', value: String(health?.counts.decisions ?? 0) },
      ],
    },
    {
      title: 'Server',
      items: [
        { label: 'HARNESS_PATH', value: health?.harnessPath ?? '—', mono: true },
        { label: 'WebSocket', value: wsConnected ? 'connected' : 'disconnected', accent: true },
        { label: 'API port', value: '3001', mono: true },
      ],
    },
    {
      title: 'Sync',
      items: [
        { label: 'Session stats', value: 'always' },
        { label: 'Concern tags', value: 'always' },
        { label: 'Learning titles', value: 'configurable' },
        { label: 'Decision metadata', value: 'title only' },
        { label: 'Knowledge content', value: 'never' },
        { label: 'Rules', value: 'never' },
      ],
    },
  ];

  return (
    <div className="os-scroll h-full p-5">
      <div className="max-w-lg space-y-6">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold mb-3 uppercase tracking-widest"
              style={{ color: 'var(--color-os-text-muted)' }}>
              {section.title}
            </h2>
            <div className="os-panel-raised rounded-xl overflow-hidden divide-y divide-white/5">
              {section.items.map(item => (
                <div key={item.label}
                  className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs" style={{ color: 'var(--color-os-text-secondary)' }}>
                    {item.label}
                  </span>
                  <span
                    className={'mono' in item && item.mono ? 'font-mono text-[10px]' : 'text-xs'}
                    style={{
                      color: item.accent
                        ? (item.value === 'connected' || item.value === 'ok' ? 'var(--color-active)' : 'var(--color-warning)')
                        : item.value === 'never' ? 'var(--color-error)'
                        : item.value === 'always' ? 'var(--color-active)'
                        : 'var(--color-os-text)',
                    }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
