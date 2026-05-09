import { useEffect, useState } from 'react';
import { useStore } from '../store';

const BOOT_LINES = [
  { text: 'initializing harness.os kernel…',                                                   delay: 0    },
  { text: 'mounting knowledge filesystem…',                                                     delay: 350  },
  { text: 'loading concerns  [relational · governance · causal · metacognitive · security]',    delay: 750  },
  { text: 'reading active rules…',                                                              delay: 1150 },
  { text: 'activating cortex…',                                                                 delay: 1500 },
  { text: 'session ready',                                                                      delay: 1900, accent: true },
];

const TOTAL_MS = 2600;

export function Boot() {
  const isBooting      = useStore((s) => s.isBooting);
  const setIsBooting   = useStore((s) => s.setIsBooting);
  const distributionName = useStore((s) => s.distributionName);

  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [progress, setProgress]         = useState(0);
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    if (!isBooting) { setVisibleLines([]); setProgress(0); setDone(false); return; }

    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines((prev) => [...prev, i]);
        setProgress(Math.round(((i + 1) / BOOT_LINES.length) * 100));
      }, line.delay));
    });

    timers.push(setTimeout(() => {
      setDone(true);
      setTimeout(() => setIsBooting(false), 500);
    }, TOTAL_MS));

    return () => timers.forEach(clearTimeout);
  }, [isBooting, setIsBooting]);

  if (!isBooting) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: 'var(--color-os-bg)',
        opacity: done ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{
            background: 'var(--color-kernel-soft)',
            border: '1px solid var(--color-kernel-glow)',
            boxShadow: '0 0 40px var(--color-kernel-glow)',
          }}
        >
          ◈
        </div>
        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-kernel)' }}>
          {distributionName || 'harness.os'}
        </span>
      </div>

      {/* Boot lines */}
      <div className="font-mono text-xs space-y-2 w-[420px]">
        {BOOT_LINES.map((line, i) => {
          const visible = visibleLines.includes(i);
          const isLast  = i === BOOT_LINES.length - 1 && visible && !done;
          return (
            <div
              key={i}
              className="flex items-start gap-2.5"
              style={{
                opacity:   visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(3px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            >
              <span style={{ color: 'var(--color-kernel)', opacity: 0.4, marginTop: 1 }}>›</span>
              <span style={{ color: line.accent ? 'var(--color-active)' : 'var(--color-os-text-secondary)', flex: 1 }}>
                {line.text}
                {isLast && <span className="blink ml-0.5" style={{ color: 'var(--color-active)' }}>▌</span>}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div
        className="mt-8 rounded-full overflow-hidden"
        style={{ width: 420, height: 2, background: 'var(--color-os-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: 'var(--color-kernel)',
            boxShadow: '0 0 8px var(--color-kernel-glow)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
