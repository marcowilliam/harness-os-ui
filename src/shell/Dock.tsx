import { useStore } from '../store';
import type { AppId } from '../store';
import { osAppDock } from '../lib/design-system';

const ICONS: Record<string, string> = {
  knowledge: '◈',
  sessions:  '⊛',
  cortex:    '◉',
  terminal:  '⌥',
  agents:    '⬡',
  settings:  '⚙',
  theory:    '⊕',
};

const PKG_ICONS: Record<string, string> = {
  parachute: '🪂',
  chart: '📊',
  book: '📖',
  hammer: '🔨',
  message: '💬',
  cog: '⚙',
  cpu: '🤖',
};

const SEPARATOR_AFTER = 'terminal';

interface DockEntry {
  id: string;
  label: string;
  icon: string;
  color?: string;
  type: 'system' | 'package';
}

export function Dock() {
  const openApp     = useStore((s) => s.openApp);
  const activeApp   = useStore((s) => s.activeApp);
  const openApps    = useStore((s) => s.openApps);
  const packageApps = useStore((s) => s.packageApps);

  const entries: DockEntry[] = [
    ...packageApps.map(pkg => ({
      id: `pkg:${pkg.slug}`,
      label: pkg.name,
      icon: PKG_ICONS[pkg.icon] ?? '○',
      color: pkg.color,
      type: 'package' as const,
    })),
    ...osAppDock.map(app => ({
      id: app.id,
      label: app.label,
      icon: ICONS[app.id] ?? '○',
      type: 'system' as const,
    })),
  ];

  const hasPkgs = packageApps.length > 0;

  return (
    <div className="flex items-end justify-center pb-3 shrink-0 z-50 select-none">
      <div
        className="os-glass flex items-center gap-0.5 px-2 py-2 rounded-2xl"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) inset' }}
      >
        {entries.map((entry, idx) => {
          const isOpen   = openApps.includes(entry.id as AppId);
          const isActive = activeApp === entry.id;

          const showPkgSeparator = hasPkgs && idx === packageApps.length;
          const showSysSeparator = !showPkgSeparator &&
            idx > 0 && entries[idx - 1]?.id === SEPARATOR_AFTER;

          return (
            <div key={entry.id} className="flex items-center">
              {(showPkgSeparator || showSysSeparator) && (
                <div
                  className="mx-2 self-stretch"
                  style={{ width: '1px', background: 'var(--color-os-border)' }}
                />
              )}

              <button
                onClick={() => openApp(entry.id as AppId)}
                title={entry.label}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl group"
                style={{
                  background: isActive ? 'var(--color-kernel-soft)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-kernel-glow)' : 'transparent'}`,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  minWidth: 52,
                }}
              >
                <span
                  className="text-lg leading-none"
                  style={{
                    color: isActive
                      ? (entry.color ?? 'var(--color-kernel)')
                      : isOpen
                        ? 'var(--color-os-text-secondary)'
                        : 'var(--color-os-text-muted)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {entry.icon}
                </span>

                <span
                  className="text-[10px] leading-none"
                  style={{
                    color: isActive
                      ? (entry.color ?? 'var(--color-kernel)')
                      : 'var(--color-os-text-muted)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {entry.label}
                </span>

                <div
                  className="absolute rounded-full"
                  style={{
                    bottom: -6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isActive ? 18 : isOpen ? 5 : 0,
                    height: 2,
                    background: isActive
                      ? (entry.color ?? 'var(--color-kernel)')
                      : 'var(--color-os-text-muted)',
                    transition: 'width 0.2s ease, background 0.15s ease',
                    opacity: isOpen ? 1 : 0,
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
