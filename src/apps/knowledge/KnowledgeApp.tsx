import { useState } from 'react';
import { useKnowledge, useKnowledgeChunk } from '../../api/hooks';
import { getHarnessType, harnessTypes, concernColors } from '../../lib/design-system';
import type { KnowledgeChunk } from '../../lib/types';

function ConcernBadge({ concern }: { concern: string }) {
  const color = concernColors[concern as keyof typeof concernColors] ?? '#6b7280';
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {concern}
    </span>
  );
}

export function KnowledgeApp() {
  const { data: domains, isLoading, isError } = useKnowledge();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<KnowledgeChunk | null>(null);
  const [concernFilter, setConcernFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: chunkDetail } = useKnowledgeChunk(
    selectedChunk?.domain ?? '',
    selectedChunk?.slug ?? ''
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-full"
      style={{ color: 'var(--color-os-text-muted)' }}>
      <span className="font-mono text-sm pulse">loading knowledge...</span>
    </div>
  );

  if (isError || !domains) return (
    <div className="flex items-center justify-center h-full"
      style={{ color: 'var(--color-error)' }}>
      <span className="text-sm">Failed to load knowledge. Is the server running?</span>
    </div>
  );

  const allConcerns = [...new Set(
    domains.flatMap(d => d.chunks?.flatMap((c: KnowledgeChunk) => c.concerns ?? []) ?? [])
  )];

  const displayedDomains = selectedDomain
    ? domains.filter(d => d.domain === selectedDomain)
    : domains;

  const filteredChunks = displayedDomains.flatMap(d =>
    (d.chunks ?? [])
      .filter((c: KnowledgeChunk) => {
        if (concernFilter && !(c.concerns ?? []).includes(concernFilter)) return false;
        if (search && !c.title?.toLowerCase().includes(search.toLowerCase()) &&
            !c.domain?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .map((c: KnowledgeChunk) => ({ ...c, domain: d.domain }))
  );

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar — domains */}
      <div className="w-48 shrink-0 os-scroll border-r"
        style={{ borderColor: 'var(--color-os-border-subtle)', background: 'var(--color-os-bg)' }}>
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => setSelectedDomain(null)}
            className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              background: !selectedDomain ? 'var(--color-kernel-soft)' : 'transparent',
              color: !selectedDomain ? 'var(--color-kernel)' : 'var(--color-os-text-secondary)',
            }}>
            All Domains
          </button>
          {domains.map(d => {
            const type = getHarnessType(d.domain);
            const typeInfo = harnessTypes[type];
            return (
              <button
                key={d.domain}
                onClick={() => setSelectedDomain(d.domain)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors"
                style={{
                  background: selectedDomain === d.domain ? 'var(--color-os-panel-raised)' : 'transparent',
                  color: selectedDomain === d.domain ? 'var(--color-os-text)' : 'var(--color-os-text-secondary)',
                }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeInfo.color }} />
                <span className="truncate">{d.domain}</span>
                <span className="ml-auto shrink-0 text-[10px]"
                  style={{ color: 'var(--color-os-text-muted)' }}>
                  {d.chunkCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Middle — chunk list */}
      <div className="w-64 shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}>
        {/* Toolbar */}
        <div className="p-2 space-y-2 border-b"
          style={{ borderColor: 'var(--color-os-border-subtle)' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chunks..."
            className="w-full px-2 py-1.5 rounded-lg text-xs bg-transparent outline-none"
            style={{
              background: 'var(--color-os-panel-raised)',
              color: 'var(--color-os-text)',
              border: '1px solid var(--color-os-border)',
            }}
          />
          <div className="flex gap-1 flex-wrap">
            {allConcerns.map(c => (
              <button key={c}
                onClick={() => setConcernFilter(concernFilter === c ? null : c)}
                className="text-[10px] px-1.5 py-0.5 rounded transition-opacity"
                style={{
                  background: concernColors[c as keyof typeof concernColors]
                    ? `${concernColors[c as keyof typeof concernColors]}20`
                    : 'var(--color-os-panel-raised)',
                  color: concernFilter === c
                    ? concernColors[c as keyof typeof concernColors] ?? 'var(--color-os-text)'
                    : 'var(--color-os-text-muted)',
                  opacity: concernFilter && concernFilter !== c ? 0.4 : 1,
                  border: `1px solid ${concernColors[c as keyof typeof concernColors] ?? 'transparent'}40`,
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 os-scroll">
          {filteredChunks.length === 0 ? (
            <div className="p-4 text-xs text-center" style={{ color: 'var(--color-os-text-muted)' }}>
              No chunks found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredChunks.map((chunk: KnowledgeChunk) => (
                <button
                  key={`${chunk.domain}/${chunk.slug}`}
                  onClick={() => setSelectedChunk(chunk)}
                  className="w-full text-left p-2 rounded-lg transition-colors"
                  style={{
                    background: selectedChunk?.slug === chunk.slug
                      ? 'var(--color-kernel-soft)'
                      : 'transparent',
                    border: selectedChunk?.slug === chunk.slug
                      ? '1px solid var(--color-kernel-glow)'
                      : '1px solid transparent',
                  }}>
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--color-os-text)' }}>
                    {chunk.title ?? chunk.slug}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-os-text-muted)' }}>
                    {chunk.domain}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(chunk.concerns ?? []).slice(0, 2).map((c: string) => (
                      <ConcernBadge key={c} concern={c} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 os-scroll p-4">
        {chunkDetail ? (
          <div className="space-y-4">
            {/* Path bar */}
            <div className="font-mono text-[10px] flex items-center gap-1"
              style={{ color: 'var(--color-os-text-muted)' }}>
              <span>core</span>
              <span>›</span>
              <span>knowledge</span>
              <span>›</span>
              <span style={{ color: 'var(--color-kernel)' }}>{chunkDetail.domain}</span>
              <span>›</span>
              <span style={{ color: 'var(--color-os-text-secondary)' }}>{chunkDetail.slug}</span>
            </div>

            <h2 className="text-base font-semibold" style={{ color: 'var(--color-os-text)' }}>
              {chunkDetail.title ?? chunkDetail.slug}
            </h2>

            {/* Metadata row */}
            <div className="flex flex-wrap gap-2 items-center">
              {(chunkDetail.concerns ?? []).map((c: string) => (
                <ConcernBadge key={c} concern={c} />
              ))}
              {(chunkDetail.tags ?? []).map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-os-panel-raised)', color: 'var(--color-os-text-muted)' }}>
                  {t}
                </span>
              ))}
              {chunkDetail.status && (
                <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto font-mono"
                  style={{ color: 'var(--color-active)', background: 'var(--color-active-soft)' }}>
                  {chunkDetail.status}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="text-xs leading-relaxed whitespace-pre-wrap selectable"
              style={{ color: 'var(--color-os-text-secondary)' }}>
              {chunkDetail.content}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full"
            style={{ color: 'var(--color-os-text-muted)' }}>
            <p className="text-xs">Select a chunk to read it</p>
          </div>
        )}
      </div>
    </div>
  );
}
