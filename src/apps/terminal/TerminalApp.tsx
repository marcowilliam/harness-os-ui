import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system' | 'header' | 'divider' | 'row' | 'flag' | 'md-code';
  text: string;
  sig?: string;  // for 'row': bright left column; text = dim right column
}

// ── Command metadata ───────────────────────────────────────────────────────

const FILESYSTEM_MAP: Array<{ cmd: string; linux: string; layer: string }> = [
  { cmd: 'list [DOMAIN]',           linux: 'ls',           layer: 'OS'    },
  { cmd: 'get DOMAIN/SLUG',         linux: 'cat',          layer: 'OS'    },
  { cmd: 'search QUERY',            linux: 'find/grep',    layer: 'OS'    },
  { cmd: 'stats',                   linux: 'df',           layer: 'OS'    },
  { cmd: 'list rules',              linux: 'ls /etc',      layer: 'OS'    },
  { cmd: 'list workflows',          linux: 'ls /usr/bin',  layer: 'OS'    },
  { cmd: 'list agents',             linux: 'ps -u',        layer: 'distro'},
  { cmd: 'list sessions PROJECT',   linux: 'last',         layer: 'OS'    },
  { cmd: 'context',                 linux: 'pwd/env',      layer: 'OS'    },
  { cmd: 'info',                    linux: 'whoami',       layer: 'OS'    },
  { cmd: 'health',                  linux: 'ping',         layer: 'OS'    },
  { cmd: 'config',                  linux: 'sysctl -a',    layer: 'OS'    },
  { cmd: 'handoff [PROJECT]',       linux: 'ipc/pipe',     layer: 'OS'    },
];

const CORTEX_MAP: Array<{ cmd: string }> = [
  { cmd: 'log decision TITLE [--rationale TEXT] [--project SLUG]' },
  { cmd: 'log learning TITLE [--content TEXT]' },
  { cmd: 'concern matrix' },
  { cmd: 'promote learning SLUG' },
];

const ALL_COMMAND_NAMES = [
  'list', 'get', 'search', 'info', 'context', 'stats', 'health', 'config',
  'log decision', 'log learning', 'concern matrix', 'handoff',
  'install', 'uninstall', 'open', 'build:software', 'build:content', 'build:product', 'workflow',
  'help', 'clear',
];

const APP_HUB: Array<{ slug: string; name: string; emoji: string; icon: string; color: string; description: string }> = [
  { slug: 'way2fly', name: 'way2fly.ai', emoji: '🪂', icon: 'parachute', color: '#818cf8', description: 'AI skydive jump logging assistant' },
  { slug: 'savings', name: 'Poupanca pros Vei', emoji: '📊', icon: 'chart', color: '#22c55e', description: 'AI savings management for family' },
  { slug: 'books', name: 'Book Assistant', emoji: '📖', icon: 'book', color: '#f97316', description: 'AI-powered book and reading log' },
  { slug: 'assistant', name: 'Assistant', emoji: '💬', icon: 'message', color: '#6366f1', description: 'Native AI assistant (Claude Code)' },
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

// ── Markdown → TerminalLine parser ────────────────────────────────────────

function parseMarkdown(md: string): TerminalLine[] {
  const lines = md.split('\n');
  const out: TerminalLine[] = [];
  let inCode = false;

  for (const raw of lines) {
    // fenced code block toggle
    if (raw.trimStart().startsWith('```')) {
      inCode = !inCode;
      if (inCode) out.push({ type: 'output', text: '' }); // opening gap
      continue;
    }
    if (inCode) {
      out.push({ type: 'md-code', text: `  ${raw}` } as unknown as TerminalLine);
      continue;
    }

    // blank line → small spacer
    if (!raw.trim()) { out.push({ type: 'divider', text: '' }); continue; }

    // headings
    const h1 = raw.match(/^#{1,2}\s+(.*)/);
    if (h1) { out.push({ type: 'header', text: h1[1] }); continue; }
    const h3 = raw.match(/^#{3,}\s+(.*)/);
    if (h3) { out.push({ type: 'system', text: h3[1] }); continue; }

    // bullet list
    const bullet = raw.match(/^(\s*)[-*+]\s+(.*)/);
    if (bullet) {
      const indent = bullet[1].length > 0 ? '    ' : '  ';
      const text = bullet[2].replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
      out.push({ type: 'output', text: `${indent}· ${text}` }); continue;
    }

    // numbered list
    const num = raw.match(/^(\s*)\d+\.\s+(.*)/);
    if (num) {
      const text = num[2].replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
      out.push({ type: 'output', text: `  ${text}` }); continue;
    }

    // strip inline markdown for paragraph text — keep it readable
    const clean = raw
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    out.push({ type: 'output', text: clean });
  }
  return out;
}

// ── Command handlers ───────────────────────────────────────────────────────

// Two-tone row: sig is bright, desc is muted — rendered as two spans
function row(sig: string, desc: string): TerminalLine {
  return { type: 'row', sig: `  ${sig}`, text: desc };
}
// Indented flag continuation — even more muted
function flag(sig: string, desc: string): TerminalLine {
  return { type: 'flag', sig: `    ${sig}`, text: desc };
}
function section(label: string): TerminalLine {
  return { type: 'system', text: label };
}
function blank(): TerminalLine {
  return { type: 'divider', text: '' };
}

function helpFilesystemMap(): TerminalLine[] {
  const C1 = 32, C2 = 16;
  const rule = `  ${'─'.repeat(C1)}  ${'─'.repeat(C2)}  ${'─'.repeat(7)}`;
  return [
    { type: 'header', text: 'filesystem map' },
    blank(),
    // Column header as a system line
    { type: 'system', text: `  ${'harness.os command'.padEnd(C1)}  ${'linux'.padEnd(C2)}  layer` },
    { type: 'output', text: rule },
    ...FILESYSTEM_MAP.map(r => ({
      type: 'row' as const,
      sig: `  ${r.cmd.padEnd(C1)}`,
      text: `  ${r.linux.padEnd(C2)}  ${r.layer}`,
    })),
    { type: 'output', text: rule },
    { type: 'system', text: `  ${'cognitive layer'.padEnd(C1)}  ${'—'.padEnd(C2)}  cortex` },
    { type: 'output', text: rule },
    ...CORTEX_MAP.map(r => ({
      type: 'row' as const,
      sig: `  ${r.cmd.padEnd(C1)}`,
      text: `  ${'—'.padEnd(C2)}  cortex`,
    })),
    blank(),
  ];
}

function helpOsDefinition(): TerminalLine[] {
  const L = 22;
  return [
    { type: 'header', text: 'harness.os — what it is' },
    blank(),

    // ── Stack ─────────────────────────────────────────────────────────────
    section('THE STACK'),
    { type: 'row', sig: `  ${'kernel'.padEnd(L)}`, text: 'harness.os — 4 knowledge types, 5 cross-cutting concerns, MCP tools' },
    { type: 'row', sig: `  ${'OS'.padEnd(L)}`,     text: 'kernel + tools + cognitive layer (the full operating system)' },
    { type: 'row', sig: `  ${'distribution'.padEnd(L)}`, text: 'your installed instance — marco.os, estateably.os, acme.os' },
    blank(),

    // ── 4 Types ───────────────────────────────────────────────────────────
    section('4 KNOWLEDGE TYPES'),
    { type: 'row', sig: `  ${'build'.padEnd(L)}`,      text: 'how you make things — architecture, conventions, dev workflow, tooling' },
    { type: 'row', sig: `  ${'product'.padEnd(L)}`,    text: 'what you ship — features, domain model, business logic, roadmap' },
    { type: 'row', sig: `  ${'operations'.padEnd(L)}`, text: 'how the system runs — infra, processes, legal, finance' },
    { type: 'row', sig: `  ${'domain'.padEnd(L)}`,     text: 'who your users are and how your world works' },
    blank(),

    // ── 5 Concerns ────────────────────────────────────────────────────────
    section('5 CROSS-CUTTING CONCERNS'),
    { type: 'row', sig: `  ${'relational'.padEnd(L)}`,    text: 'how things connect and depend on each other' },
    { type: 'row', sig: `  ${'governance'.padEnd(L)}`,    text: 'enforcement — rules that cannot be broken  [= sudo]' },
    { type: 'row', sig: `  ${'causal'.padEnd(L)}`,        text: 'why things happen — decisions, consequences, tradeoffs' },
    { type: 'row', sig: `  ${'metacognitive'.padEnd(L)}`, text: 'patterns about how you think and work' },
    { type: 'row', sig: `  ${'security'.padEnd(L)}`,      text: 'trust boundaries, access, and exposure' },
    blank(),

    // ── Cognitive Layer ───────────────────────────────────────────────────
    section('COGNITIVE LAYER  — no Linux equivalent'),
    { type: 'output', text: `  Learnings    transferable patterns that compound across sessions` },
    { type: 'output', text: `  Decisions    choices with rationale — the OS remembers why` },
    { type: 'output', text: `  Concerns     cross-cutting tags that route knowledge to the right actor` },
    { type: 'output', text: `  Handoffs     session-to-session context transfer (like IPC, but for cognition)` },
    blank(),

    // ── Analogy ───────────────────────────────────────────────────────────
    section('THE CORE ANALOGY'),
    { type: 'output', text: `  Linux:      "everything is a file"` },
    { type: 'output', text: `  harness.os: "everything is knowledge"` },
    blank(),
    { type: 'output', text: `  Linux filesystem → knowledge store` },
    { type: 'output', text: `  cat / ls / find  → get / list / search` },
    { type: 'output', text: `  /etc (config)    → rules` },
    { type: 'output', text: `  /usr/bin (progs) → workflows` },
    { type: 'output', text: `  kernel syscalls  → MCP tools` },
    { type: 'output', text: `  distributions    → marco.os, estateably.os` },
    { type: 'output', text: `  ↓ below this line Linux stops, harness.os continues ↓` },
    { type: 'output', text: `  learnings / decisions / concern matrix / handoff` },
    blank(),
  ];
}

async function handleHelp(args: string[], dist: string): Promise<TerminalLine[]> {
  if (args.includes('--filesystem-map'))  return helpFilesystemMap();
  if (args.includes('--os-definition'))   return helpOsDefinition();

  return [
    { type: 'header', text: dist },
    blank(),

    // ── Notation key ──────────────────────────────────────────────────────
    { type: 'output', text: `  UPPER   required argument` },
    { type: 'output', text: `  [word]  optional argument` },
    { type: 'output', text: `  --flag  flag (may take a value)` },
    blank(),

    // ── Knowledge ─────────────────────────────────────────────────────────
    section('KNOWLEDGE'),
    row('list',                           'list all knowledge domains'),
    row('list DOMAIN',                    'list chunks inside a domain'),
    row('get DOMAIN/SLUG',                'read a knowledge chunk'),
    row('search QUERY',                   'search all knowledge'),
    row('search QUERY --domain DOMAIN',   'search within one domain'),
    row('stats',                          'chunk counts by domain and type'),
    blank(),

    // ── Cognitive Layer ───────────────────────────────────────────────────
    section('COGNITIVE LAYER'),
    row('log decision TITLE',             'record a decision'),
    flag('--rationale TEXT',              'add rationale inline'),
    flag('--project SLUG',               'associate with a project  [default: general]'),
    row('log learning TITLE',             'capture a transferable pattern'),
    flag('--content TEXT',               'add content inline'),
    row('concern matrix',                 'coverage across the 5 cross-cutting concerns'),
    row('handoff [PROJECT]',              'latest session summary'),
    row('promote learning SLUG',          'elevate a learning to a rule  [sudo]'),
    blank(),

    // ── Session & Mesh ────────────────────────────────────────────────────
    section('SESSION & MESH'),
    row('list sessions PROJECT',          'session history for a project'),
    row('list agents',                    'registered mesh agents'),
    row('list rules',                     'active rules'),
    row('list workflows',                 'installed workflows'),
    row('context',                        'active distribution, projects, scale'),
    blank(),

    // ── Workflows ─────────────────────────────────────────────────────────
    section('WORKFLOWS'),
    row('build:software PKG "REQUEST"',   'trigger software dev process for a package'),
    row('build:content "REQUEST"',        'trigger content creation workflow'),
    row('build:product PKG "REQUEST"',    'trigger product workflow for a package'),
    row('workflow status',                'list active and recent jobs'),
    row('workflow cancel JOBID',          'cancel a running workflow'),
    blank(),

    // ── System ────────────────────────────────────────────────────────────
    section('SYSTEM'),
    row('info',                           'distribution name, actor, scale tier'),
    row('health',                         'server connection and response time'),
    row('config',                         'HARNESS_PATH, capabilities, env vars'),
    row('clear',                          'clear the terminal'),
    row('help --filesystem-map',          'linux ↔ harness.os mapping table'),
    row('help --os-definition',           'OS layers, types, concerns, cognitive layer'),
    blank(),
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
    return [{ type: 'error', text: 'Usage: get DOMAIN/SLUG' }];
  }
  const [domain, slug] = path.split('/');
  const res = await fetch(`/api/knowledge/${domain}/${slug}`);
  if (!res.ok) return [{ type: 'error', text: `Not found: ${path}` }];
  const chunk = await res.json() as Record<string, unknown>;
  const concerns = (chunk.concerns as string[] ?? []).join(', ') || '—';
  const tags     = (chunk.tags as string[] ?? []).join(', ') || '—';
  return [
    { type: 'header',  text: chunk.title as string },
    { type: 'output',  text: `  domain: ${chunk.domain as string}` },
    { type: 'output',  text: `  concerns: ${concerns}` },
    { type: 'output',  text: `  tags: ${tags}` },
    { type: 'divider', text: '' },
    ...parseMarkdown((chunk.content as string) ?? ''),
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
      { type: 'divider' as const, text: '' },
      { type: 'system' as const,  text: '  active capabilities:' },
      ...active.map(c => ({ type: 'output' as const, text: `    + ${c}` })),
    ] : []),
    ...(available.length ? [
      { type: 'divider' as const, text: '' },
      { type: 'system' as const,  text: '  available (not yet mounted):' },
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

// ── Package management ────────────────────────────────────────────────────

function handleListPackages(installed: string[]): TerminalLine[] {
  return [
    { type: 'system', text: 'package hub' },
    { type: 'divider', text: '' },
    ...APP_HUB.map(app => {
      const isInstalled = installed.includes(app.slug);
      return {
        type: 'row' as const,
        sig: `  ${app.emoji} ${app.slug}`,
        text: `${isInstalled ? '[installed]' : '[available]'}  ${app.name} — ${app.description}`,
      };
    }),
    { type: 'divider', text: '' },
    { type: 'output', text: '  install <slug>   — install a package' },
    { type: 'output', text: '  uninstall <slug> — remove a package' },
  ];
}

function handleInstall(slug: string, installed: string[]): TerminalLine[] {
  const app = APP_HUB.find(a => a.slug === slug);
  if (!app) {
    return [{ type: 'error', text: `Package "${slug}" not found. Run 'list packages' to see available.` }];
  }
  if (installed.includes(slug)) {
    return [{ type: 'output', text: `${app.emoji} ${app.name} is already installed.` }];
  }
  const { packageApps, setPackageApps } = useStore.getState();
  setPackageApps([...packageApps, {
    slug: app.slug,
    name: app.name,
    icon: app.icon,
    color: app.color,
    description: app.description,
  }]);
  return [
    { type: 'system', text: `installing ${app.name}...` },
    { type: 'output', text: `${app.emoji} ${app.name} installed. Visible in dock and launcher.` },
  ];
}

function handleUninstall(slug: string, installed: string[]): TerminalLine[] {
  const app = APP_HUB.find(a => a.slug === slug);
  if (!app) {
    return [{ type: 'error', text: `Package "${slug}" not found.` }];
  }
  if (!installed.includes(slug)) {
    return [{ type: 'output', text: `${app.emoji} ${app.name} is not installed.` }];
  }
  const { packageApps, setPackageApps } = useStore.getState();
  setPackageApps(packageApps.filter(a => a.slug !== slug));
  return [
    { type: 'system', text: `removing ${app.name}...` },
    { type: 'output', text: `${app.emoji} ${app.name} uninstalled.` },
  ];
}

function handleOpen(appName: string): TerminalLine[] {
  const { openApp } = useStore.getState();
  const systemApps: Record<string, string> = {
    knowledge: 'knowledge', sessions: 'sessions', cortex: 'cortex', cognitive: 'cortex',
    terminal: 'terminal', agents: 'agents', settings: 'settings', theory: 'theory',
    workflows: 'workflows',
  };
  const lower = appName.toLowerCase();
  const sysId = systemApps[lower];
  if (sysId) {
    openApp(sysId as import('../../store').AppId);
    return [{ type: 'output', text: `Opening ${appName}...` }];
  }
  const pkg = APP_HUB.find(a => a.slug === lower || a.name.toLowerCase() === lower);
  if (pkg) {
    openApp(`pkg:${pkg.slug}` as import('../../store').AppId);
    return [{ type: 'output', text: `Opening ${pkg.name}...` }];
  }
  return [{ type: 'error', text: `App "${appName}" not found. Try 'list packages' or 'help'.` }];
}

// ── Build / Workflow commands ─────────────────────────────────────────────

const WORKFLOW_TYPE_MAP: Record<string, string> = {
  software: 'software-dev-process',
  content: 'content-creation',
  product: 'product-development',
};

async function handleBuild(buildType: string, args: string[]): Promise<TerminalLine[]> {
  const workflow = WORKFLOW_TYPE_MAP[buildType];
  if (!workflow) {
    return [
      { type: 'error', text: `Unknown build type: "${buildType}"` },
      { type: 'output', text: '  Available: build:software, build:content, build:product' },
    ];
  }

  const pkgSlug = args[0];
  if (!pkgSlug) {
    return [
      { type: 'error', text: `Usage: build:${buildType} <package-slug> "<request>"` },
      { type: 'output', text: `  Example: build:${buildType} way2fly "add loading spinner"` },
    ];
  }

  const installed = useStore.getState().packageApps.map(a => a.slug);
  if (!installed.includes(pkgSlug)) {
    return [{ type: 'error', text: `Package "${pkgSlug}" is not installed. Run 'install ${pkgSlug}' first.` }];
  }

  const request = args.slice(1).join(' ').replace(/^["']|["']$/g, '');
  if (!request) {
    return [{ type: 'error', text: `Please provide a request. Example: build:${buildType} way2fly "add loading spinner"` }];
  }

  try {
    const res = await fetch('/api/workflow/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow, target: pkgSlug, request }),
    });

    if (!res.ok) {
      const err = await res.json() as Record<string, string>;
      return [{ type: 'error', text: err.error || 'Failed to start workflow' }];
    }

    const data = await res.json() as { jobId: string; phases: string[] };
    const { openApp } = useStore.getState();
    openApp('workflows');
    useStore.getState().setActiveWorkflowJob(data.jobId);

    return [
      { type: 'system', text: `workflow started: ${data.jobId}` },
      { type: 'output', text: `  type:    build:${buildType}` },
      { type: 'output', text: `  target:  ${pkgSlug}` },
      { type: 'output', text: `  request: ${request}` },
      { type: 'output', text: `  phases:  ${data.phases.join(' → ')}` },
      { type: 'divider', text: '' },
      { type: 'output', text: '  Opening Workflows view to monitor progress...' },
    ];
  } catch {
    return [{ type: 'error', text: 'Network error — is the server running?' }];
  }
}

async function handleWorkflow(args: string[]): Promise<TerminalLine[]> {
  const sub = args[0]?.toLowerCase();

  if (sub === 'status' || sub === 'jobs') {
    try {
      const res = await fetch('/api/workflow/jobs');
      const jobs = await res.json() as Array<Record<string, unknown>>;
      if (!jobs.length) return [{ type: 'output', text: '(no workflow jobs)' }];
      return [
        { type: 'system', text: 'workflow jobs' },
        ...jobs.map(j => ({
          type: 'row' as const,
          sig: `  ${(j.id as string).slice(0, 16)}`,
          text: `  ${(j.status as string).padEnd(10)} ${j.target as string}  "${(j.request as string).slice(0, 40)}"`,
        })),
      ];
    } catch {
      return [{ type: 'error', text: 'Failed to fetch workflow jobs' }];
    }
  }

  if (sub === 'cancel') {
    const jobId = args[1];
    if (!jobId) return [{ type: 'error', text: 'Usage: workflow cancel <jobId>' }];
    try {
      const res = await fetch(`/api/workflow/cancel/${jobId}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json() as Record<string, string>;
        return [{ type: 'error', text: err.error || 'Failed to cancel' }];
      }
      return [{ type: 'system', text: `Cancelled: ${jobId}` }];
    } catch {
      return [{ type: 'error', text: 'Network error' }];
    }
  }

  return [
    { type: 'system', text: 'workflow commands' },
    row('workflow status',                  'list active and recent jobs'),
    row('workflow cancel <jobId>',          'cancel a running workflow'),
    row('build:software <pkg> "<request>"', 'trigger software dev process'),
    row('build:content "<request>"',        'trigger content creation'),
    row('build:product <pkg> "<request>"',  'trigger product workflow'),
  ];
}

// ── Main dispatcher ────────────────────────────────────────────────────────

async function runCommand(cmd: string, dist: string): Promise<TerminalLine[]> {
  const tokens = tokenize(cmd.trim());
  if (!tokens.length) return [];
  const verb = tokens[0].toLowerCase();
  const rest = tokens.slice(1);

  try {
    if (verb === 'help')    return handleHelp(rest, dist);
    if (verb === 'list') {
      if (rest[0]?.toLowerCase() === 'packages') {
        const installed = useStore.getState().packageApps.map(a => a.slug);
        return handleListPackages(installed);
      }
      return handleList(rest);
    }
    if (verb === 'get')     return handleGet(rest);
    if (verb === 'search')  return handleSearch(rest);
    if (verb === 'info')    return handleInfo();
    if (verb === 'context') return handleContext();
    if (verb === 'stats')   return handleStats();
    if (verb === 'health')  return handleHealth();
    if (verb === 'config')  return handleConfig();
    if (verb === 'handoff') return handleHandoff(rest);
    if (verb === 'install') {
      if (!rest[0]) return [{ type: 'error', text: 'Usage: install <package-slug>' }];
      const installed = useStore.getState().packageApps.map(a => a.slug);
      return handleInstall(rest[0], installed);
    }
    if (verb === 'uninstall') {
      if (!rest[0]) return [{ type: 'error', text: 'Usage: uninstall <package-slug>' }];
      const installed = useStore.getState().packageApps.map(a => a.slug);
      return handleUninstall(rest[0], installed);
    }
    if (verb === 'open') {
      if (!rest[0]) return [{ type: 'error', text: 'Usage: open <app-name>' }];
      return handleOpen(rest.join(' '));
    }
    if (verb.startsWith('build:')) {
      const buildType = verb.split(':')[1];
      return handleBuild(buildType, rest);
    }
    if (verb === 'build') {
      return [
        { type: 'error', text: 'Usage: build:<type> <package> "<request>"' },
        { type: 'output', text: '  Types: software, content, product' },
        { type: 'output', text: '  Example: build:software way2fly "add loading spinner"' },
      ];
    }
    if (verb === 'workflow') return handleWorkflow(rest);
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

  function renderLine(line: TerminalLine, i: number) {
    // blank spacer
    if (line.type === 'divider') {
      return <div key={i} style={{ height: 6 }} />;
    }

    // section header — uppercase label, accent color, small top margin
    if (line.type === 'system') {
      return (
        <div key={i} className="leading-5 mt-1">
          <span style={{ color: 'var(--color-active)', fontWeight: 700, letterSpacing: '0.06em' }}>
            {line.text}
          </span>
        </div>
      );
    }

    // terminal title / first-line header
    if (line.type === 'header') {
      return (
        <div key={i} className="leading-5 mb-1">
          <span style={{ color: 'var(--color-kernel)', fontWeight: 700 }}>{line.text}</span>
        </div>
      );
    }

    // user-typed input line — kernel color with prompt prefix
    if (line.type === 'input') {
      return (
        <div key={i} className="flex items-start gap-2 leading-5 mt-1">
          <span className="shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.55 }}>
            {distributionName} ~ $
          </span>
          <span style={{ color: 'var(--color-kernel)', opacity: 0.9 }}>{line.text}</span>
        </div>
      );
    }

    // error
    if (line.type === 'error') {
      return (
        <div key={i} className="leading-5">
          <span style={{ color: 'var(--color-error)' }}>{line.text}</span>
        </div>
      );
    }

    // two-tone row: sig (bright) + text (muted) — for help rows
    if (line.type === 'row') {
      return (
        <div key={i} className="leading-5 flex">
          <span style={{ color: 'var(--color-os-text)', whiteSpace: 'pre' }}>{line.sig}</span>
          <span style={{ color: 'var(--color-os-text-muted)', whiteSpace: 'pre' }}>{line.text}</span>
        </div>
      );
    }

    // flag continuation — slightly indented, dimmer than row
    if (line.type === 'flag') {
      return (
        <div key={i} className="leading-5 flex">
          <span style={{ color: 'var(--color-os-text-muted)', whiteSpace: 'pre' }}>{line.sig}</span>
          <span style={{ color: 'var(--color-os-text-muted)', opacity: 0.65, whiteSpace: 'pre' }}>{line.text}</span>
        </div>
      );
    }

    // inline code block line — dim background, monospace highlight
    if (line.type === 'md-code') {
      return (
        <div key={i} className="leading-5">
          <span style={{
            color: 'var(--color-kernel)',
            background: 'rgba(99,102,241,0.08)',
            display: 'block',
            padding: '0 4px',
            whiteSpace: 'pre',
          }}>{line.text}</span>
        </div>
      );
    }

    // plain output
    return (
      <div key={i} className="leading-5">
        <span style={{ color: 'var(--color-os-text-secondary)', whiteSpace: 'pre' }}>{line.text}</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full font-mono text-xs cursor-text"
      onClick={() => inputRef.current?.focus()}
      style={{ background: 'var(--color-os-bg)' }}
    >
      {/* Output */}
      <div className="flex-1 os-scroll p-4">
        {lines.map((line, i) => renderLine(line, i))}
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
