import { useStore } from '../store';
import type { AppId } from '../store';
import { KnowledgeApp } from '../apps/knowledge/KnowledgeApp';
import { SessionsApp }  from '../apps/sessions/SessionsApp';
import { CortexApp }    from '../apps/cortex/CortexApp';
import { TerminalApp }  from '../apps/terminal/TerminalApp';
import { AgentsApp }    from '../apps/agents/AgentsApp';
import { SettingsApp }  from '../apps/settings/SettingsApp';
import { TheoryApp }    from '../apps/theory/TheoryApp';
import { osAppDock }    from '../lib/design-system';

const APP_COMPONENTS: Record<AppId, React.ComponentType> = {
  knowledge: KnowledgeApp,
  sessions:  SessionsApp,
  cortex:    CortexApp,
  terminal:  TerminalApp,
  agents:    AgentsApp,
  settings:  SettingsApp,
  theory:    TheoryApp,
};

const APP_TITLES: Record<AppId, string> = {
  knowledge: 'Knowledge Manager',
  sessions:  'Session Monitor',
  cortex:    'Cognitive Layer',
  terminal:  'Terminal',
  agents:    'Agents',
  settings:  'Settings',
  theory:    'Theory',
};

const APP_ICONS: Record<AppId, string> = {
  knowledge: '◈',
  sessions:  '⊛',
  cortex:    '◉',
  terminal:  '⌥',
  agents:    '⬡',
  settings:  '⚙',
  theory:    '⊕',
};

const APP_DESCS: Record<AppId, string> = {
  knowledge: 'Browse and search knowledge domains',
  sessions:  'Monitor sessions and handoffs',
  cortex:    'Learnings, decisions, concern coverage',
  terminal:  'CLI — direct command access',
  agents:    'Mesh agents and access profiles',
  settings:  'Distribution configuration',
  theory:    'OS layers, types, and concerns map',
};

function AppWindow({ appId }: { appId: AppId }) {
  const activeApp    = useStore((s) => s.activeApp);
  const setActiveApp = useStore((s) => s.setActiveApp);
  const closeApp     = useStore((s) => s.closeApp);
  const isActive     = activeApp === appId;
  const Component    = APP_COMPONENTS[appId];

  return (
    <div
      onClick={() => !isActive && setActiveApp(appId)}
      className="absolute inset-5 flex flex-col overflow-hidden window-in"
      style={{
        borderRadius: 12,
        background: 'var(--color-os-panel)',
        border: `1px solid ${isActive ? 'var(--color-kernel-glow)' : 'var(--color-os-border)'}`,
        borderTop: `2px solid ${isActive ? 'var(--color-kernel)' : 'var(--color-os-border)'}`,
        boxShadow: isActive
          ? '0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.75), 0 0 40px rgba(99,102,241,0.06)'
          : '0 16px 48px rgba(0,0,0,0.5)',
        opacity: isActive ? 1 : 0.55,
        zIndex: isActive ? 10 : 1,
        transform: isActive ? 'none' : 'scale(0.985)',
        pointerEvents: isActive ? 'auto' : 'none',
        transition: 'opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* ── Title bar ────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 40,
          borderBottom: '1px solid var(--color-os-border-subtle)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        {/* Traffic lights */}
        <div className="traffic-lights shrink-0">
          <button
            className="traffic-light traffic-light-close"
            onClick={(e) => { e.stopPropagation(); closeApp(appId); }}
            title="Close"
          />
          <div className="traffic-light traffic-light-inert" title="Minimize (use dock)" />
          <div className="traffic-light traffic-light-inert" title="Full screen" />
        </div>

        {/* App icon + title (centered) */}
        <div className="flex-1 flex items-center justify-center gap-1.5 -ml-[60px]">
          <span className="text-xs leading-none" style={{ color: 'var(--color-os-text-muted)' }}>
            {APP_ICONS[appId]}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isActive ? 'var(--color-os-text-secondary)' : 'var(--color-os-text-muted)' }}
          >
            {APP_TITLES[appId]}
          </span>
        </div>

        {/* Right side spacer to balance traffic lights */}
        <div style={{ width: 60 }} />
      </div>

      {/* ── App content ──────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <Component />
      </div>
    </div>
  );
}

function EmptyState() {
  const openApp = useStore((s) => s.openApp);
  const distName = useStore((s) => s.distributionName);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
      {/* Distribution wordmark */}
      <div className="flex flex-col items-center gap-2 select-none">
        <div
          className="text-3xl leading-none"
          style={{ color: 'var(--color-kernel)', opacity: 0.25 }}
        >
          ◈
        </div>
        <p
          className="font-mono text-sm font-semibold tracking-wide"
          style={{ color: 'var(--color-os-text-muted)' }}
        >
          {distName || 'harness.os'}
        </p>
      </div>

      {/* App launcher grid */}
      <div className="grid grid-cols-4 gap-2 px-8">
        {osAppDock.map((app) => (
          <button
            key={app.id}
            className="os-launcher-card"
            onClick={() => openApp(app.id as AppId)}
          >
            <span
              className="text-2xl leading-none"
              style={{ color: 'var(--color-os-text-muted)' }}
            >
              {APP_ICONS[app.id as AppId] ?? '○'}
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-os-text-secondary)' }}
            >
              {app.label}
            </span>
            <span
              className="text-[10px] text-center leading-snug max-w-[90px]"
              style={{ color: 'var(--color-os-text-muted)' }}
            >
              {APP_DESCS[app.id as AppId]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Desktop() {
  const openApps = useStore((s) => s.openApps);

  return (
    <div
      className="relative flex-1 overflow-hidden os-desktop-bg"
      style={{ background: 'var(--color-os-desktop)' }}
    >
      {/* Ambient glow — adapts to distribution brand */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 35% at 50% 0%, var(--color-kernel-glow) 0%, transparent 70%)',
          opacity: 0.3,
        }}
      />

      {/* Empty state / launcher */}
      {openApps.length === 0 && <EmptyState />}

      {/* App windows */}
      {openApps.map((appId) => (
        <AppWindow key={appId} appId={appId} />
      ))}
    </div>
  );
}
