import { useState } from 'react';
import { useHealth, useAgents } from '../../api/hooks';
import { concerns, concernColors, concernLabels, harnessTypes } from '../../lib/design-system';
import type { MeshAgent } from '../../lib/types';

// ── Data ──────────────────────────────────────────────────────────────────

const OS_LAYERS = [
  {
    label: 'Desktop Environment', name: 'harness-os-ui',
    desc: 'React app that behaves like an OS. The surface you interact with.',
    color: '#6366f1',
  },
  {
    label: 'Distribution', name: '[name].os',
    desc: 'Your installed instance — knowledge, rules, workflows, agents. marco.os / estateably.os.',
    color: '#a855f7',
  },
  {
    label: 'OS', name: 'harness.os',
    desc: 'Kernel + cognitive layer + CLI. Sessions, workflows, sync. The cognitive gap no OS has closed.',
    color: '#10b981',
  },
  {
    label: 'Kernel', name: '4 types · 5 concerns · MCP tools',
    desc: '"Everything is knowledge." The invariant core. MCP tools are the syscalls.',
    color: '#f59e0b',
  },
  {
    label: 'Storage / KAL Driver', name: 'Scale 1–3',
    desc: 'Files (Scale 1) → Database (Scale 2) → Remote MCP (Scale 3). Same commands, swappable driver.',
    color: '#71717a',
  },
];

const LINUX_MAP = [
  { linux: 'ls',             harness: 'list [domain]',                layer: 'os' },
  { linux: 'cat',            harness: 'get {domain}/{slug}',           layer: 'os' },
  { linux: 'find / grep',    harness: 'search {query}',                layer: 'os' },
  { linux: 'mkdir',          harness: 'add domain {name}',             layer: 'os' },
  { linux: 'rm',             harness: 'remove knowledge {d}/{s}',      layer: 'os' },
  { linux: 'mv',             harness: 'move knowledge {slug} --to {d}',layer: 'os' },
  { linux: 'ps',             harness: 'list sessions',                 layer: 'os' },
  { linux: 'whoami',         harness: 'info',                          layer: 'os' },
  { linux: 'df',             harness: 'stats',                         layer: 'os' },
  { linux: 'ping',           harness: 'health',                        layer: 'os' },
  { linux: 'env',            harness: 'config',                        layer: 'os' },
  { linux: 'rsync',          harness: 'sync',                          layer: 'os' },
  { linux: 'mount',          harness: 'mount {driver} {path}',         layer: 'os' },
  { linux: 'systemctl start',harness: 'start session {project}',       layer: 'os' },
  { linux: '—',              harness: 'log decision "{title}"',        layer: 'cortex' },
  { linux: '—',              harness: 'log learning "{title}"',        layer: 'cortex' },
  { linux: '—',              harness: 'concern {slug} --tag {c}',      layer: 'cortex' },
  { linux: '—',              harness: 'handoff',                       layer: 'cortex' },
  { linux: '—',              harness: 'concern matrix',                layer: 'cortex' },
];

const ACTORS = [
  {
    name: 'Human user', role: 'root',
    mechanism: 'CLI + files (S1) / CLI (S2+)',
    cogRead: true, cogWrite: true, sudo: true,
    desc: 'Root access. At Scale 1, can also bypass via direct file edit.',
    color: '#6366f1',
  },
  {
    name: 'Inner harness', role: 'trusted daemon',
    mechanism: 'MCP tools only',
    cogRead: true, cogWrite: true, sudo: true,
    desc: 'Full cognitive layer access. Sudo requires governance decision logged.',
    color: '#10b981',
  },
  {
    name: 'Specialized agent', role: 'scoped service',
    mechanism: 'MCP tools (read-only subset)',
    cogRead: true, cogWrite: false, sudo: false,
    desc: 'Declared domains only. Can read cognitive layer, cannot write it.',
    color: '#f59e0b',
  },
  {
    name: 'External / API', role: 'guest',
    mechanism: 'MCP tools (restricted)',
    cogRead: false, cogWrite: false, sudo: false,
    desc: 'Explicitly listed domains only. No cognitive layer access.',
    color: '#71717a',
  },
];

const SCALE_TIERS = [
  {
    scale: 'S1', name: 'Files', enforcement: 'Convention',
    desc: 'YAML/MD on disk. Human can bypass via file edit.',
    color: '#6366f1',
  },
  {
    scale: 'S2', name: 'Database', enforcement: 'Credential-gated',
    desc: 'Postgres. Agents need DB creds. Human uses CLI same as agents.',
    color: '#10b981',
  },
  {
    scale: 'S3', name: 'Remote MCP', enforcement: 'Structural',
    desc: 'GitHub/Jira/Slack drivers. Everyone uses same API. No bypass path.',
    color: '#a855f7',
  },
];

const SUDO_OPS = [
  { op: 'promote_learning → rule',  why: 'Changes constraints on ALL future agent behavior' },
  { op: 'remove knowledge',         why: 'Permanent deletion — irreversible' },
  { op: 'modify_rule',              why: 'Changes what constrains agent behavior' },
  { op: 'sync --push',              why: 'Sends data outside this distribution' },
  { op: 'mount {driver}',           why: 'Expands the KAL driver surface' },
  { op: 'add_concern / add_type',   why: 'Extends the kernel taxonomy' },
];

// ── Tabs ──────────────────────────────────────────────────────────────────

type Tab = 'stack' | 'cli' | 'actors' | 'kernel';

function TabBtn({ id, active, onClick, label }: { id: Tab; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      key={id}
      onClick={onClick}
      className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all"
      style={{
        background: active ? 'var(--color-kernel-soft)' : 'transparent',
        color: active ? 'var(--color-kernel)' : 'var(--color-os-text-muted)',
        border: `1px solid ${active ? 'var(--color-kernel-glow)' : 'transparent'}`,
      }}
    >
      {label}
    </button>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────

function StackSection({ health }: { health: ReturnType<typeof useHealth>['data'] }) {
  return (
    <div className="space-y-6">
      {/* OS Stack */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-os-text-muted)' }}>The Stack</h3>
        <div className="space-y-1.5">
          {OS_LAYERS.map(layer => (
            <div key={layer.label} className="os-panel-raised rounded-xl p-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ background: layer.color, boxShadow: `0 0 6px ${layer.color}80` }} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-os-text)' }}>
                    {layer.name}
                  </span>
                  <span className="text-[10px]" style={{ color: layer.color }}>
                    {layer.label}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
                  {layer.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Types */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-os-text-muted)' }}>4 Harness Types</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(harnessTypes).map(([slug, type]) => (
            <div key={slug} className="os-panel-raised rounded-xl p-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: type.color }} />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>{type.label}</p>
                <p className="text-[10px] font-mono" style={{ color: 'var(--color-os-text-muted)' }}>{slug}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 Concerns */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-os-text-muted)' }}>5 Cross-cutting Concerns</h3>
        <div className="space-y-1.5">
          {concerns.map(slug => (
            <div key={slug} className="os-panel-raised rounded-xl p-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ background: concernColors[slug], boxShadow: `0 0 6px ${concernColors[slug]}60` }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>
                {concernLabels[slug]}
              </span>
              {slug === 'governance' && (
                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-kernel-soft)', color: 'var(--color-kernel)' }}>
                  sudo mechanism
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* The cognitive layer insight */}
      <div className="os-panel-raised rounded-xl p-4"
        style={{ border: '1px solid var(--color-kernel-glow)' }}>
        <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--color-kernel)' }}>
          The cognitive layer — no OS equivalent
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
          Unix said "everything is a file." harness.os says "everything is knowledge."
          The OS layer maps 1:1 to Linux. The cognitive layer on top — learnings, decisions,
          concerns, metacognition, handoffs — is what no computing OS has ever had.
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
          Commands that don't map to Linux <span style={{ color: 'var(--color-cortex)' }}>ARE</span> the cortex.
          {' '}The gap is the differentiator.
        </p>
      </div>

      {/* Knowledge counts from live data */}
      {health && (
        <div className="os-panel-raised rounded-xl p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-os-text-muted)' }}>
            This distribution — live counts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(health.counts).map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-lg font-semibold font-mono" style={{ color: 'var(--color-kernel)' }}>{v}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>{k}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CliSection() {
  const osCmds = LINUX_MAP.filter(c => c.layer === 'os');
  const cortexCmds = LINUX_MAP.filter(c => c.layer === 'cortex');

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
        Every CLI command either maps to a Linux equivalent, or has no OS equivalent at all.
        The commands that <em>don't</em> map are the cognitive layer — the cortex.
      </p>

      {/* OS-mapped commands */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-os-text-muted)' }}>
          Filesystem Commands (maps to Linux)
        </h3>
        <div className="space-y-1">
          {osCmds.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
              style={{ background: i % 2 === 0 ? 'var(--color-os-panel-raised)' : 'transparent' }}>
              <span className="font-mono text-[10px] w-28 shrink-0"
                style={{ color: 'var(--color-os-text-muted)' }}>{c.linux}</span>
              <span className="font-mono text-[10px] flex-1"
                style={{ color: 'var(--color-kernel)' }}>{c.harness}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cognitive layer commands */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-cortex)' }}>
          Cognitive Layer (no OS equivalent — this is the cortex)
        </h3>
        <div className="space-y-1">
          {cortexCmds.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
              style={{ background: i % 2 === 0 ? 'var(--color-os-panel-raised)' : 'transparent' }}>
              <span className="font-mono text-[10px] w-28 shrink-0"
                style={{ color: 'var(--color-os-text-muted)' }}>—</span>
              <span className="font-mono text-[10px] flex-1"
                style={{ color: 'var(--color-cortex)' }}>{c.harness}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-3 leading-relaxed"
          style={{ color: 'var(--color-os-text-muted)' }}>
          These commands have no Linux equivalent because they represent cognition, not filesystem operations.
          They are the cortex: the part no computing OS has ever had.
        </p>
      </div>

      {/* Sudo operations */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-warning)' }}>
          Sudo-required operations (governance check)
        </h3>
        <div className="space-y-1">
          {SUDO_OPS.map((s, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-1.5 rounded-lg"
              style={{ background: i % 2 === 0 ? 'var(--color-os-panel-raised)' : 'transparent' }}>
              <span className="font-mono text-[10px] w-44 shrink-0"
                style={{ color: 'var(--color-warning)' }}>{s.op}</span>
              <span className="text-[10px] leading-relaxed"
                style={{ color: 'var(--color-os-text-muted)' }}>{s.why}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActorsSection({ agents }: { agents: MeshAgent[] }) {
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
        Four actors interact with harness.os, each with a different mechanism, access scope, and enforcement level.
        Scale determines how well the access model is enforced.
      </p>

      {/* Actor hierarchy */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-os-text-muted)' }}>Actor Hierarchy</h3>
        <div className="space-y-1.5">
          {ACTORS.map(actor => (
            <div key={actor.name} className="os-panel-raised rounded-xl p-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ background: actor.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-os-text)' }}>{actor.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: `${actor.color}18`, color: actor.color }}>
                    {actor.role}
                  </span>
                  {actor.sudo && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--color-warning)18', color: 'var(--color-warning)' }}>
                      sudo
                    </span>
                  )}
                </div>
                <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
                  via: {actor.mechanism}
                </p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
                  {actor.desc}
                </p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[10px]" style={{ color: actor.cogRead ? 'var(--color-active)' : 'var(--color-error)' }}>
                    {actor.cogRead ? '✓' : '✕'} read cognitive
                  </span>
                  <span className="text-[10px]" style={{ color: actor.cogWrite ? 'var(--color-active)' : 'var(--color-error)' }}>
                    {actor.cogWrite ? '✓' : '✕'} write cognitive
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scale enforcement */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: 'var(--color-os-text-muted)' }}>Scale Changes Enforcement</h3>
        <div className="space-y-1.5">
          {SCALE_TIERS.map(tier => (
            <div key={tier.scale} className="os-panel-raised rounded-xl p-3 flex items-start gap-3">
              <span className="font-mono text-xs font-bold shrink-0 w-6"
                style={{ color: tier.color }}>{tier.scale}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-os-text)' }}>
                    {tier.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: `${tier.color}18`, color: tier.color }}>
                    {tier.enforcement}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
                  {tier.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2 leading-relaxed px-1"
          style={{ color: 'var(--color-os-text-muted)' }}>
          Starting at Scale 1 doesn't sacrifice the security model — it defers enforcement until scale supports it.
          Access declarations written now are enforced structurally at Scale 2+.
        </p>
      </div>

      {/* Live agents in this distribution */}
      {agents.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-os-text-muted)' }}>
            Registered Agents — This Distribution
          </h3>
          <div className="space-y-1.5">
            {agents.map(agent => {
              const level = agent.access?.level ?? 'unknown';
              const levelColor = level === 'inner-harness' ? 'var(--color-active)'
                : level === 'specialized' ? 'var(--color-warning)'
                : 'var(--color-os-text-muted)';
              return (
                <div key={agent.slug} className="os-panel-raised rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-os-text)' }}>
                        {agent.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${levelColor}18`, color: levelColor }}>
                        {level}
                      </span>
                      {agent.access?.sudo.enabled && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--color-warning)18', color: 'var(--color-warning)' }}>
                          sudo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
                      domains: {Array.isArray(agent.access?.read.domains)
                        ? agent.access.read.domains.join(', ')
                        : agent.access?.read.domains ?? '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KernelSection() {
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
        The harness.os kernel is the invariant core — the part that doesn't change regardless of
        distribution, scale, or agent. It defines the type system, the session lifecycle, and the
        syscall interface (MCP tools).
      </p>

      {/* Kernel access path */}
      <div>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-os-text-muted)' }}>Kernel Access Path</h3>
        <div className="space-y-1">
          {[
            { label: 'Agent (user process)',       linux: 'User process',    color: '#6366f1' },
            { label: 'CLI / REST adapter',          linux: 'Shell / glibc',   color: '#a855f7' },
            { label: 'MCP protocol',               linux: 'glibc / POSIX',   color: '#10b981' },
            { label: 'MCP tools (syscalls)',        linux: 'open() read()',   color: '#f59e0b' },
            { label: 'kernel (4 types · 5 concerns)',linux: 'VFS / scheduler',color: '#ef4444' },
            { label: 'KAL driver (files/DB/remote)',linux: 'Block driver',    color: '#71717a' },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: i % 2 === 0 ? 'var(--color-os-panel-raised)' : 'transparent' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: row.color }} />
              <span className="text-[11px] flex-1 font-mono" style={{ color: 'var(--color-os-text)' }}>
                {row.label}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: 'var(--color-os-text-muted)' }}>
                ← {row.linux}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Workflows at OS layer */}
      <div className="os-panel-raised rounded-xl p-4">
        <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--color-warning)' }}>
          Workflows belong at the OS layer, not the kernel
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
          Workflows are shell scripts / systemd units built on MCP tool syscalls.
          A workflow step calling <span className="font-mono" style={{ color: 'var(--color-kernel)' }}>get_knowledge</span> is
          like a shell script calling <span className="font-mono" style={{ color: 'var(--color-os-text-muted)' }}>open()/read()</span>.
          The kernel provides the primitives; workflows compose them into higher-level processes.
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
          Stack: Kernel (MCP tools, 4 types, 5 concerns) → OS (workflows, rules, cognitive layer) → Distribution (specific knowledge, agents)
        </p>
      </div>

      {/* KAL */}
      <div className="os-panel-raised rounded-xl p-4">
        <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--color-active)' }}>
          KAL — Knowledge Abstraction Layer
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
          Like Linux VFS — the same commands work on any storage driver.
          <span className="font-mono" style={{ color: 'var(--color-kernel)' }}> get knowledge architecture/event-sourcing</span> works
          whether the driver is files, Postgres, or a GitHub remote.
          The command never changes. The driver does.
        </p>
        <div className="mt-3 space-y-1">
          {[
            { scale: 'S1', driver: 'YAML/Markdown files',        color: '#6366f1' },
            { scale: 'S2', driver: 'Postgres (Neon)',             color: '#10b981' },
            { scale: 'S3', driver: 'Remote MCP (GitHub, Jira…)', color: '#a855f7' },
          ].map(row => (
            <div key={row.scale} className="flex items-center gap-3">
              <span className="font-mono text-[10px] w-6" style={{ color: row.color }}>{row.scale}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>{row.driver}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progressive Distribution */}
      <div className="os-panel-raised rounded-xl p-4"
        style={{ border: '1px solid var(--color-cortex-glow)' }}>
        <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--color-cortex)' }}>
          Progressive Distribution
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-os-text-secondary)' }}>
          Distributions start minimal and grow as the system signals it needs more.
          The kernel offers the full surface. The distribution activates what it needs now.
          The cognitive layer holds the signals for what comes next.
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>
          "Ubuntu can't tell you when to install nginx. harness.os knows when to grow."
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function TheoryApp() {
  const { data: health } = useHealth();
  const { data: agents = [] } = useAgents();
  const [tab, setTab] = useState<Tab>('stack');

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'stack',  label: 'Stack & Types' },
    { id: 'cli',    label: 'CLI Map' },
    { id: 'actors', label: 'Actors & Scale' },
    { id: 'kernel', label: 'Kernel & KAL' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-os-border-subtle)' }}>
        {TABS.map(t => (
          <TabBtn key={t.id} id={t.id} active={tab === t.id} onClick={() => setTab(t.id)} label={t.label} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 os-scroll p-4">
        <div className="max-w-2xl">
          {tab === 'stack'  && <StackSection  health={health} />}
          {tab === 'cli'    && <CliSection />}
          {tab === 'actors' && <ActorsSection agents={agents as MeshAgent[]} />}
          {tab === 'kernel' && <KernelSection />}
        </div>
      </div>
    </div>
  );
}
