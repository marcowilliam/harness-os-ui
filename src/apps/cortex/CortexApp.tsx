import { useState } from 'react';
import { useLearnings, useDecisions } from '../../api/hooks';
import { concernColors } from '../../lib/design-system';
import type { Learning, Decision } from '../../lib/types';

function ConcernBadge({ concern }: { concern: string }) {
  const color = concernColors[concern as keyof typeof concernColors] ?? '#6b7280';
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {concern}
    </span>
  );
}

function LearningsTab() {
  const { data: learnings = [], isLoading } = useLearnings();
  const [selected, setSelected] = useState<Learning | null>(null);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full pulse text-xs"
      style={{ color: 'var(--color-os-text-muted)' }}>
      loading learnings...
    </div>
  );

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 os-scroll border-r p-2 space-y-1.5"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}>
        {learnings.length === 0 ? (
          <p className="text-xs text-center p-4" style={{ color: 'var(--color-os-text-muted)' }}>
            No learnings yet
          </p>
        ) : learnings.map((l: Learning) => (
          <button
            key={l.slug}
            onClick={() => setSelected(l)}
            className="w-full text-left p-2.5 rounded-xl transition-colors"
            style={{
              background: selected?.slug === l.slug ? 'var(--color-cortex-soft)' : 'var(--color-os-panel-raised)',
              border: `1px solid ${selected?.slug === l.slug ? 'var(--color-cortex-glow)' : 'var(--color-os-border-subtle)'}`,
            }}>
            <p className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>
              {l.title}
            </p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {(l.concerns ?? []).map((c: string) => <ConcernBadge key={c} concern={c} />)}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 os-scroll p-4">
        {selected ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-os-text)' }}>
              {selected.title}
            </h2>
            <div className="flex gap-1.5 flex-wrap">
              {(selected.concerns ?? []).map((c: string) => <ConcernBadge key={c} concern={c} />)}
              {(selected.tags ?? []).map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-os-panel-raised)', color: 'var(--color-os-text-muted)' }}>
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap selectable"
              style={{ color: 'var(--color-os-text-secondary)' }}>
              {selected.content}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
              Select a learning to read it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionsTab() {
  const { data: decisions = [], isLoading } = useDecisions();
  const [selected, setSelected] = useState<Decision | null>(null);
  const [concernFilter, setConcernFilter] = useState<string | null>(null);

  const allConcerns = [...new Set(
    decisions.flatMap((d: Decision) => [
      ...(d.concerns ?? []),
      ...(d.concern ? [d.concern] : []),
    ])
  )];

  const filtered = concernFilter
    ? decisions.filter((d: Decision) =>
        (d.concerns ?? []).includes(concernFilter) || d.concern === concernFilter
      )
    : decisions;

  if (isLoading) return (
    <div className="flex items-center justify-center h-full pulse text-xs"
      style={{ color: 'var(--color-os-text-muted)' }}>
      loading decisions...
    </div>
  );

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}>
        <div className="p-2 border-b flex gap-1 flex-wrap"
          style={{ borderColor: 'var(--color-os-border-subtle)' }}>
          {allConcerns.map((c: string) => (
            <button key={c}
              onClick={() => setConcernFilter(concernFilter === c ? null : c)}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: concernColors[c as keyof typeof concernColors]
                  ? `${concernColors[c as keyof typeof concernColors]}20`
                  : 'var(--color-os-panel-raised)',
                color: concernFilter === c
                  ? concernColors[c as keyof typeof concernColors] ?? 'var(--color-os-text)'
                  : 'var(--color-os-text-muted)',
                opacity: concernFilter && concernFilter !== c ? 0.4 : 1,
              }}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 os-scroll p-2 space-y-1.5">
          {filtered.map((d: Decision) => (
            <button
              key={d.slug}
              onClick={() => setSelected(d)}
              className="w-full text-left p-2.5 rounded-xl transition-colors"
              style={{
                background: selected?.slug === d.slug ? 'var(--color-kernel-soft)' : 'var(--color-os-panel-raised)',
                border: `1px solid ${selected?.slug === d.slug ? 'var(--color-kernel-glow)' : 'var(--color-os-border-subtle)'}`,
              }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>{d.title}</p>
              {d.project && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-os-text-muted)' }}>
                  {d.project}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 os-scroll p-4">
        {selected ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-os-text)' }}>
              {selected.title}
            </h2>
            {selected.project && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-os-panel-raised)', color: 'var(--color-os-text-muted)' }}>
                {selected.project}
              </span>
            )}
            <p className="text-xs leading-relaxed selectable"
              style={{ color: 'var(--color-os-text-secondary)' }}>
              {selected.rationale}
            </p>
            {selected.context && (
              <div className="mt-2 p-3 rounded-lg text-xs"
                style={{ background: 'var(--color-os-panel-raised)', color: 'var(--color-os-text-muted)' }}>
                {selected.context}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
              Select a decision to view rationale
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncPanel() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-full max-w-md space-y-4">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--color-os-text-secondary)' }}>
          Cognitive Sync
        </h3>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <div className="os-panel-raised p-3 rounded-xl text-xs space-y-1">
            <p className="font-mono" style={{ color: 'var(--color-kernel)' }}>marco.os</p>
            <p style={{ color: 'var(--color-os-text-muted)' }}>Personal machine</p>
          </div>
          <div className="flex items-center justify-center pt-3">
            <span style={{ color: 'var(--color-os-text-muted)' }}>⟷</span>
          </div>
          <div className="os-panel-raised p-3 rounded-xl text-xs space-y-1">
            <p className="font-mono" style={{ color: 'var(--color-os-text-secondary)' }}>estateably.os</p>
            <p style={{ color: 'var(--color-os-text-muted)' }}>Work machine</p>
          </div>
        </div>
        <div className="os-panel-raised p-3 rounded-xl text-xs space-y-1.5">
          <p className="font-medium" style={{ color: 'var(--color-os-text-secondary)' }}>What crosses</p>
          <div className="space-y-1">
            {['Session stats', 'Concern tags', 'Learning titles', 'Decision metadata'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-active)' }} />
                <span style={{ color: 'var(--color-os-text-muted)' }}>{item}</span>
              </div>
            ))}
          </div>
          <p className="font-medium mt-2" style={{ color: 'var(--color-os-text-secondary)' }}>What never crosses</p>
          <div className="space-y-1">
            {['Knowledge content', 'Rules', 'Source code context', 'Decision rationale'].map(item => (
              <div key={item} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-error)' }} />
                <span style={{ color: 'var(--color-os-text-muted)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="w-full py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            background: 'var(--color-kernel-soft)',
            color: 'var(--color-kernel)',
            border: '1px solid var(--color-kernel-glow)',
          }}>
          Sync Now
        </button>
      </div>
    </div>
  );
}

export function CortexApp() {
  const [tab, setTab] = useState<'learnings' | 'decisions' | 'sync'>('learnings');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-0 shrink-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: 'var(--color-cortex)' }}>cognitive layer</span>
          <span className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
            — what no computing OS has
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}>
        {(['learnings', 'decisions', 'sync'] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === t ? 'var(--color-kernel-soft)' : 'transparent',
              color: tab === t ? 'var(--color-kernel)' : 'var(--color-os-text-muted)',
            }}>
            {t === 'learnings' ? 'Learnings' : t === 'decisions' ? 'Decisions' : 'Sync'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'learnings' && <LearningsTab />}
        {tab === 'decisions' && <DecisionsTab />}
        {tab === 'sync' && <SyncPanel />}
      </div>
    </div>
  );
}
