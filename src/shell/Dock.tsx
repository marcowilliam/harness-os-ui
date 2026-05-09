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

// Separator between main apps and system apps
const SEPARATOR_AFTER = 'terminal';

export function Dock() {
  const openApp   = useStore((s) => s.openApp);
  const activeApp = useStore((s) => s.activeApp);
  const openApps  = useStore((s) => s.openApps);

  return (
    <div className="flex items-end justify-center pb-3 shrink-0 z-50 select-none">
      <div
        className="os-glass flex items-center gap-0.5 px-2 py-2 rounded-2xl"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04) inset' }}
      >
        {osAppDock.map((app, idx) => {
          const isOpen   = openApps.includes(app.id as AppId);
          const isActive = activeApp === app.id;

          return (
            <div key={app.id} className="flex items-center">
              {/* Separator before system apps */}
              {idx > 0 && osAppDock[idx - 1]?.id === SEPARATOR_AFTER && (
                <div
                  className="mx-2 self-stretch"
                  style={{ width: '1px', background: 'var(--color-os-border)' }}
                />
              )}

              <button
                onClick={() => openApp(app.id as AppId)}
                title={app.label}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl group"
                style={{
                  background: isActive ? 'var(--color-kernel-soft)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-kernel-glow)' : 'transparent'}`,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  minWidth: 52,
                }}
              >
                {/* Icon */}
                <span
                  className="text-lg leading-none"
                  style={{
                    color: isActive
                      ? 'var(--color-kernel)'
                      : isOpen
                        ? 'var(--color-os-text-secondary)'
                        : 'var(--color-os-text-muted)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {ICONS[app.id] ?? '○'}
                </span>

                {/* Label */}
                <span
                  className="text-[10px] leading-none"
                  style={{
                    color: isActive
                      ? 'var(--color-kernel)'
                      : 'var(--color-os-text-muted)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {app.label}
                </span>

                {/* Open indicator bar */}
                <div
                  className="absolute rounded-full"
                  style={{
                    bottom: -6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isActive ? 18 : isOpen ? 5 : 0,
                    height: 2,
                    background: isActive
                      ? 'var(--color-kernel)'
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
