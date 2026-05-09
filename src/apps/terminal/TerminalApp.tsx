import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'header' | 'divider';
  text: string;
}

// ── Command metadata ───────────────────────────────────────────────────────

const OS_COMMANDS: Array<{ cmd: string; linux: string; desc: string }> = [
  { cmd: 'list [domain]',                linux: 'ls',     desc: 'list knowledge domains or chunks' },
  { cmd: 'get {domain}/{slug}',          linux: 'cat',    desc: 'read a specific knowledge chunk' },
  { cmd: 'search {query}',              linux: 'find',   desc: 'search knowledge by query' },
  { cmd: 'info',                         linux: 'whoami', desc: 'distribution and actor info' },
  { cmd: 'context',                      linux: 'pwd',    desc: 'current session context' },
  { cmd: 'stats',                        linux: 'df',     desc: 'knowledge counts by domain' },
  { cmd: 'health',                       linux: 'ping',   desc: 'system health check' },
  { cmd: 'config',                       linux: 'env',    desc: 'distribution configuration' },
  { cmd: 'list sessions [project]',      linux: 'ps',     desc: 'session list' },
  { cmd: 'list agents',                  linux: 'ls',     desc: 'registered mesh agents' },
  { cmd: 'list rules',                   linux: 'ls /etc', desc: 'active system rules' },
  { cmd: 'list workflows',               linux: 'ls /bin', desc: 'installed workflows' },
];

const CORTEX_COMMANDS: Array<{ cmd: string; desc: string; sudo?: boolean }> = [
  { cmd: 'log decision "{title}"',       desc: 'record a decision with rationale' },
  { cmd: 'log learning "{title}"',       desc: 'capture a transferable pattern' },
  { cmd: 'concern matrix',               desc: 'concern coverage across all knowledge' },
  { cmd: 'handoff [project]',            desc: 'latest session summary' },
  { cmd: 'promote learning {slug}',      desc: 'promote learning to rule', sudo: true },
  { cmd: 'remove knowledge {d}/{s}',     desc: 'remove a knowledge chunk', sudo: true },
];

const ALL_COMMAND_NAMES = [
  'list', 'get', 'search', 'info', 'context', 'stats', 'health', 'config',
  'log decision', 'log learning', 'concern matrix', 'handoff',
  'help', 'clear',
];

// ── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  for (const ch of cmd) {
    if (ch === '"' && !inQuote)  { inQuote = true; continue; }
    if (ch === '"' && inQuote)   { inQuote = false; tokens.push(current); current = ''; continue; }
    if (ch === ' ' && !inQuote)  { if (current) { tokens.push(current); current = ''; } continue; }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function flagValue(tokens: string[], flag: string): string {
  const idx = tokens.indexOf(flag);
  return idx !== -1 && tokens[idx + 1] ? tokens[idx + 1] : '';
}

// ── Command handlers ───────────────────────────────────────────────────────

async function handleHelp(target: string, dist: string): Promise<TerminalLine[]> {
  if (target) {
    const found = [...OS_COMMANDS, ...CORTEX_COMMANDS].find(c =>
      c.cmd.startsWith(target)
    );
    if (found) {
      return [
        { type: 'system', text: found.cmd },
        { type: 'output', text: `  ${'linux' in found ? `Linux: ${found.linux}` : 'Cognitive Layer — no OS equivalent'}` },
        { type: 'output', text: `  ${found.desc}` },
      ];
    }
    return [{ type: 'error', text: `No help for "${target}"` }];
  }

  return [
    { type: 'header', text: `${dist} ~ harness.os terminal` },
    { type: 'divider', text: '' },
    { type: 'system', text: 'FILESYSTEM COMMANDS  (maps to Linux)' },
    ...OS_COMMANDS.map(c => ({
      type: 'output' as const,
      text: `  ${c.cmd.padEnd(32)} ${c.linux.padEnd(10)} ${c.desc}`,
    })),
    { type: 'divider', text: '' },
    { type: 'system', text: 'COGNITIVE LAYER  (no OS equivalent — this is the cortex)' },
    ...CORTEX_COMMANDS.map(c => ({
      type: 'output' as const,
      text: `  ${c.cmd.padEnd(32)} ${c.sudo ? '[sudo] ' : '       '}${c.desc}`,
    })),
  ];
}

async function handleList(args: string[]): Promise<TerminalLine[]> {
  const sub = args[0]?.toLowerCase();

  if (sub === 'sessions') {
    const project = args[1] ?? '';
    if (!project) {
      return [{ type: 'error', text: 'Usage: list sessions {project}' }];
    }
    const res = await fetch(`/api/sessions/${project}`);
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!data.length) return [{ type: 'output', text: `(no sessions for ${project})` }];
    return data.map(s => ({
      type: 'output' as const,
      text: `  ${((s.slug ?? s.date) as string).padEnd(20)} ${s.summary as string ?? ''}`.slice(0, 80),
    }));
  }

  if (sub === 'agents') {
    const res = await fetch('/api/mesh/agents');
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!data.length) return [{ type: 'output', text: '(no agents registered)' }];
    return data.flatMap(a => [
      { type: 'system' as const, text: `  ${a.name as string} (${a.slug as string})` },
      { type: 'output' as const, text: `    status: ${a.status as string}  type: ${a.type as string}` },
    ]);
  }

  if (sub === 'rules') {
    const res = await fetch('/api/rules');
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!data.length) return [{ type: 'output', text: '(no rules)' }];
    return data.map(r => ({
      type: 'output' as const,
      text: `  ${(r.slug as string).padEnd(28)} ${r.name as string ?? ''}`,
    }));
  }

  if (sub === 'workflows') {
    const res = await fetch('/api/workflows');
    const data = await res.json() as Array<Record<string, unknown>>;
    if (!data.length) return [{ type: 'output', text: '(no workflows)' }];
    return data.map(w => ({
      type: 'output' as const,
      text: `  ${(w.slug as string).padEnd(28)} ${w.name as string ?? ''}`,
    }));
  }

  if (sub && sub !== 'sessions' && sub !== 'agents' && sub !== 'rules' && sub !== 'workflows') {
    // Treat as domain name
    const res = await fetch(`/api/knowledge/${sub}`);
    if (!res.ok) return [{ type: 'error', text: `Domain "${sub}" not found` }];
    const data = await res.json() as { domain: string; chunks: Array<Record<string, unknown>> };
    if (!data.chunks?.length) return [{ type: 'output', text: `(domain "${sub}" is empty)` }];
    return data.chunks.map(c => ({
      type: 'output' as const,
      text: `  ${(c.slug as string).padEnd(28)} ${c.title as string ?? ''}`,
    }));
  }

  // Default: list all domains
  const res = await fetch('/api/knowledge');
  const data = await res.json() as Array<{ domain: string; chunkCount: number }>;
  if (!data.length) return [{ type: 'output', text: '(no knowledge domains)' }];
  return [
    { type: 'system', text: '  domain                         chunks' },
    ...data.map(d => ({
      type: 'output' as const,
      text: `  ${d.domain.padEnd(32)} ${d.chunkCount}`,
    })),
  ];
}

async function handleGet(args: string[]): Promise<TerminalLine[]> {
  const path = args[0] ?? '';
  if (!path || !path.includes('/')) {
    return [{ type: 'error', text: 'Usage: get {domain}/{slug}' }];
  }
  const [domain, slug] = path.split('/');
  const res = await fetch(`/api/knowledge/${domain}/${slug}`);
  if (!res.ok) return [{ type: 'error', text: `Not found: ${path}` }];
  const chunk = await res.json() as Record<string, unknown>;
  return [
    { type: 'system',  text: chunk.title as string },
    { type: 'output',  text: `domain: ${chunk.domain as string}  concerns: ${(chunk.concerns as string[] ?? []).join(', ') || '—'}` },
    { type: 'output',  text: `tags: ${(chunk.tags as string[] ?? []).join(', ') || '—'}` },
    { type: 'divider', text: '' },
    ...((chunk.content as string) ?? '').split('\n').slice(0, 20).map(l => ({
      type: 'output' as const,
      text: l,
    })),
  ];
}

async function handleSearch(args: string[]): Promise<TerminalLine[]> {
  const domainFlag = flagValue(args, '--domain');
  const query = args.filter(a => !a.startsWith('--') && a !== domainFlag).join(' ').toLowerCase();
  if (!query) return [{ type: 'error', text: 'Usage: search {query} [--domain {d}]' }];

  const res = await fetch(domainFlag ? `/api/knowledge/${domainFlag}` : '/api/knowledge');
  const raw = await res.json();
  const domains: Array<{ domain: string; chunks: Array<Record<string, unknown>> }> = domainFlag
    ? [raw as { domain: string; chunks: Array<Record<string, unknown>> }]
    : (raw as Array<{ domain: string; chunks: Array<Record<string, unknown>> }>);

  const matches: TerminalLine[] = [];
  for (const d of domains) {
    for (const c of (d.chunks ?? [])) {
      const searchable = `${c.title} ${c.content} ${(c.tags as string[] ?? []).join(' ')}`.toLowerCase();
      if (searchable.includes(query)) {
        matches.push({ type: 'system', text: `  ${d.domain}/${c.slug as string}` });
        matches.push({ type: 'output', text: `    ${c.title as string}` });
      }
    }
  }
  if (!matches.length) return [{ type: 'output', text: `(no results for "${query}")` }];
  return [{ type: 'output', text: `${matches.length / 2} result(s) for "${query}":` }, ...matches];
}

async function handleInfo(): Promise<TerminalLine[]> {
  const res = await fetch('/api/health');
  const data = await res.json() as Record<string, unknown>;
  return [
    { type: 'system', text: data.distribution as string },
    { type: 'output', text: `actor:      human (root)` },
    { type: 'output', text: `scale:      1 (files)` },
    { type: 'output', text: `harness:    ${data.harnessPath as string}` },
    { type: 'output', text: `status:     ${data.status as string}` },
  ];
}

async function handleContext(): Promise<TerminalLine[]> {
  const res = await fetch('/api/health');
  const data = await res.json() as Record<string, unknown>;
  const projects = (data.projects as string[]) ?? [];
  return [
    { type: 'output', text: `distribution: ${data.distribution as string}` },
    { type: 'output', text: `projects:     ${projects.join(', ') || '(none)'}` },
    { type: 'output', text: `scale:        1 (files — ${data.harnessPath as string})` },
  ];
}

async function handleStats(): Promise<TerminalLine[]> {
  const res = await fetch('/api/health');
  const data = await res.json() as Record<string, unknown>;
  const counts = data.counts as Record<string, number> ?? {};
  const domains = data.domains as string[] ?? [];
  return [
    { type: 'system', text: 'knowledge store usage' },
    { type: 'output', text: `  knowledge chunks   ${String(counts.knowledge ?? 0).padStart(6)}` },
    { type: 'output', text: `  rules              ${String(counts.rules ?? 0).padStart(6)}` },
    { type: 'output', text: `  workflows          ${String(counts.workflows ?? 0).padStart(6)}` },
    { type: 'output', text: `  learnings          ${String(counts.learnings ?? 0).padStart(6)}` },
    { type: 'output', text: `  decisions          ${String(counts.decisions ?? 0).padStart(6)}` },
    { type: 'divider', text: '' },
    { type: 'output', text: `  domains: ${domains.join(', ')}` },
  ];
}

async function handleHealth(): Promise<TerminalLine[]> {
  const t0 = Date.now();
  const res = await fetch('/api/health');
  const data = await res.json() as Record<string, unknown>;
  const ms = Date.now() - t0;
  return [
    { type: 'system', text: `${data.status === 'ok' ? '● online' : '○ degraded'}  ${ms}ms` },
    { type: 'output', text: `backend: ${data.backend as string ?? 'file'}` },
    { type: 'output', text: `path:    ${data.harnessPath as string}` },
  ];
}

async function handleConfig(): Promise<TerminalLine[]> {
  const res = await fetch('/api/health');
  const data = await res.json() as Record<string, unknown>;
  const caps = data.capabilities as Record<string, unknown> ?? {};
  const active = caps.active as string[] ?? [];
  const available = caps.available as Array<{ capability: string; signal: string }> ?? [];
  return [
    { type: 'system', text: 'distribution configuration' },
    { type: 'output', text: `  DISTRIBUTION=${data.distribution as string}` },
    { type: 'output', text: `  HARNESS_PATH=${data.harnessPath as string}` },
    { type: 'output', text: `  SCALE=1` },
    ...(active.length ? [
      { type: 'divider', text: '' },
      { type: 'system',  text: '  active capabilities:' },
      ...active.map(c => ({ type: 'output' as const, text: `    + ${c}` })),
    ] : []),
    ...(available.length ? [
      { type: 'divider', text: '' },
      { type: 'system',  text: '  available (not yet mounted):' },
      ...available.map(c => ({ type: 'output' as const, text: `    ~ ${c.capability}  [signal: ${c.signal}]` })),
    ] : []),
  ];
}

async function handleLogDecision(args: string[]): Promise<TerminalLine[]> {
  const title = args[0] ?? '';
  if (!title) return [{ type: 'error', text: 'Usage: log decision "{title}" [--rationale "{...}"] [--project {slug}]' }];
  const rationale = flagValue(args, '--rationale');
  const project = flagValue(args, '--project') || 'general';
  const res = await fetch('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, rationale, project }),
  });
  if (!res.ok) return [{ type: 'error', text: 'Failed to log decision' }];
  const data = await res.json() as Record<string, unknown>;
  return [
    { type: 'system', text: `decision logged: ${title}` },
    { type: 'output', text: `  slug:    ${data.slug as string}` },
    { type: 'output', text: `  project: ${project}` },
    { type: 'output', text: rationale ? `  rationale: ${rationale}` : `  (no rationale — add with --rationale "{...}")` },
  ];
}

async function handleLogLearning(args: string[]): Promise<TerminalLine[]> {
  const title = args[0] ?? '';
  if (!title) return [{ type: 'error', text: 'Usage: log learning "{title}" [--content "{...}"]' }];
  const content = flagValue(args, '--content');
  const res = await fetch('/api/learnings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) return [{ type: 'error', text: 'Failed to log learning' }];
  const data = await res.json() as Record<string, unknown>;
  return [
    { type: 'system', text: `learning logged: ${title}` },
    { type: 'output', text: `  slug: ${data.slug as string}` },
    { type: 'output', text: content ? `  content: ${content}` : `  (no content — add with --content "{...}")` },
  ];
}

async function handleConcernMatrix(): Promise<TerminalLine[]> {
  const res = await fetch('/api/knowledge');
  const domains = await res.json() as Array<{ domain: string; chunks: Array<Record<string, unknown>> }>;

  const matrix: Record<string, { count: number; domains: string[] }> = {};
  let untagged = 0;

  for (const d of domains) {
    for (const c of (d.chunks ?? [])) {
      const concerns = c.concerns as string[] ?? [];
      if (!concerns.length) { untagged++; continue; }
      for (const concern of concerns) {
        if (!matrix[concern]) matrix[concern] = { count: 0, domains: [] };
        matrix[concern].count++;
        if (!matrix[concern].domains.includes(d.domain)) matrix[concern].domains.push(d.domain);
      }
    }
  }

  if (!Object.keys(matrix).length && !untagged) {
    return [{ type: 'output', text: '(no knowledge indexed yet)' }];
  }

  return [
    { type: 'system', text: 'concern coverage matrix' },
    { type: 'divider', text: '' },
    ...Object.entries(matrix)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([concern, data]) => ({
        type: 'output' as const,
        text: `  ${concern.padEnd(18)} ${String(data.count).padStart(3)} chunks   (${data.domains.join(', ')})`,
      })),
    ...(untagged ? [{ type: 'output' as const, text: `  (untagged)         ${String(untagged).padStart(3)} chunks` }] : []),
  ];
}

async function handleHandoff(args: string[]): Promise<TerminalLine[]> {
  const project = args[0] ?? '';
  if (!project) {
    const res = await fetch('/api/health');
    const data = await res.json() as Record<string, unknown>;
    const projects = data.projects as string[] ?? [];
    if (!projects.length) return [{ type: 'error', text: 'Usage: handoff {project}' }];
    return [{ type: 'error', text: `Usage: handoff {project}. Available: ${projects.join(', ')}` }];
  }
  const res = await fetch(`/api/sessions/${project}`);
  const sessions = await res.json() as Array<Record<string, unknown>>;
  if (!sessions.length) return [{ type: 'output', text: `(no sessions for ${project})` }];
  const last = sessions[sessions.length - 1];
  const lines: TerminalLine[] = [
    { type: 'system',  text: `handoff — ${project} — ${last.date as string ?? 'recent'}` },
    { type: 'output',  text: last.summary as string ?? '' },
    { type: 'divider', text: '' },
    { type: 'system',  text: 'work completed:' },
    ...((last.workCompleted as string[] ?? [])).map(l => ({ type: 'output' as const, text: `  ✓ ${l}` })),
    { type: 'divider', text: '' },
    { type: 'system',  text: 'next steps:' },
    ...((last.nextSteps as string[] ?? [])).map(l => ({ type: 'output' as const, text: `  › ${l}` })),
  ];
  if ((last.openQuestions as string[] ?? []).length) {
    lines.push({ type: 'divider', text: '' });
    lines.push({ type: 'system', text: 'open questions:' });
    for (const q of (last.openQuestions as string[])) {
      lines.push({ type: 'output', text: `  ? ${q}` });
    }
  }
  return lines;
}

// ── Main dispatcher ────────────────────────────────────────────────────────

async function runCommand(cmd: string, dist: string): Promise<TerminalLine[]> {
  const tokens = tokenize(cmd.trim());
  if (!tokens.length) return [];
  const verb = tokens[0].toLowerCase();
  const rest = tokens.slice(1);

  try {
    if (verb === 'help')    return handleHelp(rest[0] ?? '', dist);
    if (verb === 'list')    return handleList(rest);
    if (verb === 'get')     return handleGet(rest);
    if (verb === 'search')  return handleSearch(rest);
    if (verb === 'info')    return handleInfo();
    if (verb === 'context') return handleContext();
    if (verb === 'stats')   return handleStats();
    if (verb === 'health')  return handleHealth();
    if (verb === 'config')  return handleConfig();
    if (verb === 'handoff') return handleHandoff(rest);
    if (verb === 'concern' && rest[0]?.toLowerCase() === 'matrix') return handleConcernMatrix();
    if (verb === 'log') {
      const sub = rest[0]?.toLowerCase();
      const args = rest.slice(1);
      if (sub === 'decision') return handleLogDecision(args);
      if (sub === 'learning') return handleLogLearning(args);
      return [{ type: 'error', text: 'Usage: log decision | log learning' }];
    }
    return [{ type: 'error', text: `Unknown command: ${cmd}. Type 'help' to see available commands.` }];
  } catch {
    return [{ type: 'error', text: `Command failed — is the server running?` }];
  }
}

// ── Tab completion ─────────────────────────────────────────────────────────

function tabComplete(input: string): string {
  if (!input) return input;
  const lower = input.toLowerCase();
  const match = ALL_COMMAND_NAMES.find(c => c.startsWith(lower) && c !== lower);
  return match ?? input;
}

// ── Component ──────────────────────────────────────────────────────────────

export function TerminalApp() {
  const distributionName = useStore((s) => s.distributionName) || 'harness.os';
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'header', text: `${distributionName} terminal` },
    { type: 'output', text: `type 'help' for available commands` },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  async function submit() {
    const cmd = input.trim();
    if (!cmd) return;
    setLines(prev => [...prev, { type: 'input', text: cmd }]);
    setHistory(prev => [cmd, ...prev]);
    setHistoryIdx(-1);
    setInput('');
    if (cmd === 'clear') {
      setLines([{ type: 'header', text: `${distributionName} terminal` }]);
      return;
    }
    const results = await runCommand(cmd, distributionName);
    setLines(prev => [...prev, ...results]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { submit(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      setInput(tabComplete(input));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setInput(history[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? '' : history[idx]);
    }
  }

  function lineStyle(type: TerminalLine['type']): React.CSSProperties {
    switch (type) {
      case 'input':   return { color: 'var(--color-kernel)', opacity: 0.9 };
      case 'system':  return { color: 'var(--color-active)', fontWeight: 600 };
      case 'header':  return { color: 'var(--color-kernel)', fontWeight: 700 };
      case 'divider': return { color: 'transparent', height: '4px', display: 'block' };
      case 'error':   return { color: 'var(--color-error)' };
      default:        return { color: 'var(--color-os-text-secondary)' };
    }
  }

  return (
    <div
      className="flex flex-col h-full font-mono text-xs cursor-text"
      onClick={() => inputRef.current?.focus()}
      style={{ background: 'var(--color-os-bg)' }}
    >
      {/* Output */}
      <div className="flex-1 os-scroll p-4 space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2 leading-5">
            {line.type === 'input' && (
              <span className="shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.5 }}>
                {distributionName} ~ $
              </span>
            )}
            <span style={lineStyle(line.type)}>{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t shrink-0"
        style={{ borderColor: 'var(--color-os-border-subtle)' }}
      >
        <span className="font-mono text-xs shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.6 }}>
          {distributionName} ~ $
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-transparent outline-none text-xs font-mono"
          style={{ color: 'var(--color-os-text)', caretColor: 'var(--color-kernel)' }}
          spellCheck={false}
          placeholder="type a command…"
        />
      </div>
    </div>
  );
}
