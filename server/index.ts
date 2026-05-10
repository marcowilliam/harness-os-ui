import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'chokidar';
import { spawn } from 'child_process';
import { McpManager, PackageManifest } from './mcp.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const HARNESS_PATH = process.env.HARNESS_PATH || path.join(process.cwd(), 'test-harness');

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// --- Key transformation ---

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result;
  }
  return obj;
}

// --- Helpers ---

function safeReadDir(dir: string): string[] {
  try { return fs.readdirSync(dir); } catch { return []; }
}

function safeReadFile(filePath: string): string | null {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
}

function parseMdFile(filePath: string) {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  const { data, content } = matter(raw);
  return { ...data, content: content.trim(), slug: path.basename(filePath, '.md') };
}

function parseYamlFile(filePath: string) {
  const raw = safeReadFile(filePath);
  if (!raw) return null;
  try {
    return { ...(yaml.load(raw) as Record<string, unknown>), slug: path.basename(filePath, '.yaml') };
  } catch { return null; }
}

function getAllDomains(): string[] {
  const knowledgeDir = path.join(HARNESS_PATH, 'core', 'knowledge');
  return safeReadDir(knowledgeDir).filter((d) =>
    fs.statSync(path.join(knowledgeDir, d)).isDirectory()
  );
}

// --- Routes ---

function jsonT(res: express.Response, data: unknown) {
  res.json(transformKeys(data));
}

// Health
app.get('/api/health', (_req, res) => {
  const domains = getAllDomains();
  let knowledgeCount = 0;
  for (const d of domains) {
    knowledgeCount += safeReadDir(path.join(HARNESS_PATH, 'core', 'knowledge', d))
      .filter((f) => f.endsWith('.md')).length;
  }
  const rulesCount = safeReadDir(path.join(HARNESS_PATH, 'core', 'rules'))
    .filter((f) => f.endsWith('.md')).length;
  const workflowsCount = safeReadDir(path.join(HARNESS_PATH, 'core', 'workflows'))
    .filter((f) => f.endsWith('.yaml')).length;
  const learningsCount = safeReadDir(path.join(HARNESS_PATH, 'core', 'learnings'))
    .filter((f) => f.endsWith('.md')).length;
  const decisionsDir = path.join(HARNESS_PATH, 'core', 'decisions');
  let decisionsCount = 0;
  for (const proj of safeReadDir(decisionsDir)) {
    const projPath = path.join(decisionsDir, proj);
    if (fs.existsSync(projPath) && fs.statSync(projPath).isDirectory()) {
      decisionsCount += safeReadDir(projPath).filter((f) => f.endsWith('.md')).length;
    }
  }

  // Read distribution config from harness.yaml
  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const distribution = (harnessYaml?.distribution as string) ?? 'harness.os';
  const projects = (harnessYaml?.projects as Array<{ slug: string }> | undefined)
    ?.map(p => p.slug) ?? [];
  const brand = (harnessYaml?.brand as Record<string, string> | undefined) ?? null;
  const capabilities = (harnessYaml?.capabilities as Record<string, unknown> | undefined) ?? null;
  const apps = (harnessYaml?.apps as Record<string, unknown> | undefined) ?? null;
  const users = (harnessYaml?.users as Record<string, unknown> | undefined) ?? null;
  const instance = (harnessYaml?.instance as Record<string, unknown> | undefined) ?? null;

  // MCP server status for packages
  const mcpStatus: Record<string, { status: string; tools: string[] }> = {};
  for (const conn of mcpManager.getAllConnections()) {
    mcpStatus[conn.slug] = {
      status: conn.status,
      tools: conn.tools.map(t => t.name),
    };
  }

  jsonT(res, {
    status: 'ok',
    backend: 'file',
    harnessPath: HARNESS_PATH,
    distribution,
    projects,
    brand,
    capabilities,
    apps,
    users,
    instance,
    mcp: mcpStatus,
    counts: {
      knowledge: knowledgeCount,
      rules: rulesCount,
      workflows: workflowsCount,
      learnings: learningsCount,
      decisions: decisionsCount,
    },
    domains,
  });
});

// Knowledge — all domains with chunk counts
app.get('/api/knowledge', (_req, res) => {
  const domains = getAllDomains();
  const result = domains.map((domain) => {
    const domainDir = path.join(HARNESS_PATH, 'core', 'knowledge', domain);
    const files = safeReadDir(domainDir).filter((f) => f.endsWith('.md'));
    const chunks = files.map((f) => {
      const parsed = parseMdFile(path.join(domainDir, f));
      if (!parsed) return null;
      const { content: _content, ...meta } = parsed;
      return { ...meta, domain };
    }).filter(Boolean);
    return { domain, chunkCount: chunks.length, chunks };
  });
  jsonT(res, result);
});

// Knowledge — chunks in a domain
app.get('/api/knowledge/:domain', (req, res) => {
  const { domain } = req.params;
  const domainDir = path.join(HARNESS_PATH, 'core', 'knowledge', domain);
  if (!fs.existsSync(domainDir)) {
    return res.status(404).json({ error: `Domain "${domain}" not found` });
  }
  const files = safeReadDir(domainDir).filter((f) => f.endsWith('.md'));
  const chunks = files.map((f) => {
    const parsed = parseMdFile(path.join(domainDir, f));
    if (!parsed) return null;
    const { content: _content, ...meta } = parsed;
    return { ...meta, domain };
  }).filter(Boolean);
  jsonT(res, { domain, chunkCount: chunks.length, chunks });
});

// Knowledge — full chunk content
app.get('/api/knowledge/:domain/:slug', (req, res) => {
  const { domain, slug } = req.params;
  const filePath = path.join(HARNESS_PATH, 'core', 'knowledge', domain, `${slug}.md`);
  const parsed = parseMdFile(filePath);
  if (!parsed) {
    return res.status(404).json({ error: `Chunk "${domain}/${slug}" not found` });
  }
  jsonT(res, { ...parsed, domain });
});

// Rules
app.get('/api/rules', (_req, res) => {
  const rulesDir = path.join(HARNESS_PATH, 'core', 'rules');
  const files = safeReadDir(rulesDir).filter((f) => f.endsWith('.md'));
  const rules = files.map((f) => parseMdFile(path.join(rulesDir, f))).filter(Boolean);
  jsonT(res, rules);
});

// Workflows
app.get('/api/workflows', (_req, res) => {
  const workflowsDir = path.join(HARNESS_PATH, 'core', 'workflows');
  const files = safeReadDir(workflowsDir).filter((f) => f.endsWith('.yaml'));
  const workflows = files.map((f) => parseYamlFile(path.join(workflowsDir, f))).filter(Boolean);
  jsonT(res, workflows);
});

// Learnings
app.get('/api/learnings', (_req, res) => {
  const learningsDir = path.join(HARNESS_PATH, 'core', 'learnings');
  const files = safeReadDir(learningsDir).filter((f) => f.endsWith('.md'));
  const learnings = files.map((f) => parseMdFile(path.join(learningsDir, f))).filter(Boolean);
  jsonT(res, learnings);
});

// Decisions
app.get('/api/decisions', (_req, res) => {
  const decisionsDir = path.join(HARNESS_PATH, 'core', 'decisions');
  const projects = safeReadDir(decisionsDir);
  const decisions: unknown[] = [];
  for (const proj of projects) {
    const projPath = path.join(decisionsDir, proj);
    if (!fs.existsSync(projPath) || !fs.statSync(projPath).isDirectory()) continue;
    const files = safeReadDir(projPath).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      const parsed = parseMdFile(path.join(projPath, f));
      if (parsed) decisions.push({ ...parsed, project: proj });
    }
  }
  jsonT(res, decisions);
});

// Sessions
app.get('/api/sessions/:project', (req, res) => {
  const { project } = req.params;
  const sessionsDir = path.join(HARNESS_PATH, 'product', 'sessions', project);
  if (!fs.existsSync(sessionsDir)) {
    return jsonT(res, []);
  }
  const files = safeReadDir(sessionsDir).filter((f) => f.endsWith('.yaml') && f !== 'metrics');
  const sessions = files.map((f) => parseYamlFile(path.join(sessionsDir, f))).filter(Boolean);
  jsonT(res, sessions);
});

// Session metrics
app.get('/api/sessions/:project/metrics', (req, res) => {
  const { project } = req.params;
  const metricsDir = path.join(HARNESS_PATH, 'product', 'sessions', project, 'metrics');
  if (!fs.existsSync(metricsDir)) {
    return jsonT(res, []);
  }
  const files = safeReadDir(metricsDir).filter((f) => f.endsWith('.yaml')).sort();
  const metrics = files.map((f) => parseYamlFile(path.join(metricsDir, f))).filter(Boolean);
  jsonT(res, metrics);
});

// Audit log
app.get('/api/audit', (_req, res) => {
  const auditPath = path.join(HARNESS_PATH, 'mesh', 'journal-bridge-audit.log');
  const raw = safeReadFile(auditPath);
  if (!raw) {
    return jsonT(res, []);
  }
  const entries = raw.trim().split('\n').map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  jsonT(res, entries);
});

// Mesh agents
app.get('/api/mesh/agents', (_req, res) => {
  const agentsDir = path.join(HARNESS_PATH, 'mesh', 'agents');
  if (!fs.existsSync(agentsDir)) {
    return jsonT(res, []);
  }
  const files = safeReadDir(agentsDir).filter((f) => f.endsWith('.yaml'));
  const agents = files.map((f) => parseYamlFile(path.join(agentsDir, f))).filter(Boolean);
  jsonT(res, agents);
});

// Mesh events
app.get('/api/mesh/events', (_req, res) => {
  const eventsPath = path.join(HARNESS_PATH, '.events', 'current-session.jsonl');
  const raw = safeReadFile(eventsPath);
  if (!raw) {
    return jsonT(res, []);
  }
  const events = raw.trim().split('\n').map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  jsonT(res, events);
});

// SSE — live event stream
app.get('/api/events/live', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  function transformLine(line: string): string {
    try {
      const parsed = JSON.parse(line);
      return JSON.stringify(transformKeys(parsed));
    } catch {
      return line;
    }
  }

  const eventsPath = path.join(HARNESS_PATH, '.events', 'current-session.jsonl');
  let lastSize = 0;

  const existing = safeReadFile(eventsPath);
  if (existing) {
    const lines = existing.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      res.write(`data: ${transformLine(line)}\n\n`);
    }
    lastSize = Buffer.byteLength(existing, 'utf-8');
  }

  const interval = setInterval(() => {
    try {
      const stat = fs.statSync(eventsPath);
      if (stat.size > lastSize) {
        const fd = fs.openSync(eventsPath, 'r');
        const buffer = Buffer.alloc(stat.size - lastSize);
        fs.readSync(fd, buffer, 0, buffer.length, lastSize);
        fs.closeSync(fd);
        const newData = buffer.toString('utf-8');
        const lines = newData.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          res.write(`data: ${transformLine(line)}\n\n`);
        }
        lastSize = stat.size;
      }
    } catch {
      // File may not exist yet
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// POST — log decision
app.post('/api/decisions', (req, res) => {
  const { title, rationale = '', project = 'general', concern = '' } = req.body as Record<string, string>;
  if (!title) return res.status(400).json({ error: 'title required' });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  const fm = `---\ntitle: "${title}"\nrationale: "${rationale.replace(/"/g, '\\"')}"\nconcern: "${concern}"\ncreated: "${date}"\n---\n\n${rationale}`;
  const dir = path.join(HARNESS_PATH, 'core', 'decisions', project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.md`), fm);
  return res.json({ slug, project, created: date });
});

// POST — log learning
app.post('/api/learnings', (req, res) => {
  const { title, content = '', tags = [], concerns = [] } = req.body as { title: string; content?: string; tags?: string[]; concerns?: string[] };
  if (!title) return res.status(400).json({ error: 'title required' });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10);
  const fm = `---\ntitle: "${title}"\ntags: [${tags.map(t => `"${t}"`).join(', ')}]\nconcerns: [${concerns.map(c => `"${c}"`).join(', ')}]\ncreated: "${date}"\n---\n\n${content}`;
  const dir = path.join(HARNESS_PATH, 'core', 'learnings');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.md`), fm);
  return res.json({ slug, created: date });
});

// --- HTTP Server + WebSocket ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'ping' }));
});

function broadcast(msg: { type: string; queryKeys?: string[][] }) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// --- Assistant (Claude Code CLI) ---

app.post('/api/assistant/chat', (req, res) => {
  const { messages, activeApp } = req.body as { messages: Array<{ role: string; content: string }>; activeApp?: string };
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const distName = (harnessYaml?.distribution as string) ?? 'harness.os';

  const lastMessage = messages[messages.length - 1].content;

  let systemPrompt: string;

  if (activeApp) {
    // Context-aware: build prompt with app's MCP tools and assistant context
    const manifestPath = getPackageManifestPath(activeApp);
    const manifest = manifestPath ? loadPackageManifest(manifestPath) : null;
    const conn = mcpManager.getConnection(activeApp);
    const toolList = conn?.tools.map(t => `- ${t.name}: ${t.description}`).join('\n') || '';

    const appPrompt = manifest?.assistant?.system_prompt || '';
    systemPrompt = [
      `You are the native assistant for ${distName}, running inside harness.os.`,
      appPrompt,
      toolList ? `\nAvailable tools:\n${toolList}` : '',
      `\nWhen the user asks for data, use the available tools. Keep responses concise.`,
      `Return structured data when tools return results so the UI can render it.`,
    ].filter(Boolean).join('\n');
  } else {
    systemPrompt = [
      `You are the native assistant for ${distName}.`,
      `You are running inside harness.os — a Layer 2 operating system that turns files into structured knowledge.`,
      `The distribution data is at: ${HARNESS_PATH}`,
      `Keep responses concise (2-4 sentences). You can reference knowledge domains, rules, and workflows available in the OS.`,
    ].join(' ');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const child = spawn('claude', [
    '-p', lastMessage,
    '--output-format', 'stream-json',
    '--verbose',
    '--system-prompt', systemPrompt,
    '--max-turns', '1',
    '--dangerously-skip-permissions',
  ], {
    env: { ...process.env, HOME: process.env.HOME },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let lastTextLen = 0;
  let buffer = '';

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === 'assistant' && event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === 'text' && block.text.length > lastTextLen) {
              const delta = block.text.slice(lastTextLen);
              lastTextLen = block.text.length;
              res.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`);
            }
          }
        } else if (event.type === 'result' && event.result) {
          if (lastTextLen === 0) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: event.result })}\n\n`);
          }
        }
      } catch {
        // not JSON
      }
    }
  });

  child.on('close', () => {
    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer);
        if (event.type === 'result' && event.result && lastTextLen === 0) {
          res.write(`data: ${JSON.stringify({ type: 'delta', text: event.result })}\n\n`);
        }
      } catch { /* ignore */ }
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  });

  child.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', text: `Failed to start Claude: ${err.message}` })}\n\n`);
    res.end();
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      child.kill();
    }
  });
});

// --- Workflow Engine ---

interface WorkflowPhase {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  instruction: string;
}

interface WorkflowJob {
  id: string;
  workflow: string;
  target: string;
  request: string;
  status: 'queued' | 'running' | 'complete' | 'error';
  currentPhase: string;
  phases: WorkflowPhase[];
  logs: Array<{ phase: string; text: string; ts: number }>;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

const workflowJobs = new Map<string, WorkflowJob>();
const workflowListeners = new Map<string, Set<(event: string) => void>>();

function emitWorkflowEvent(jobId: string, event: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const listeners = workflowListeners.get(jobId);
  if (listeners) {
    for (const send of listeners) send(data);
  }
  broadcast({ type: 'workflow_progress', queryKeys: [['workflow', 'jobs']] });
}

function getPackageSource(slug: string): string | null {
  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const apps = harnessYaml?.apps as Record<string, Record<string, unknown>> | undefined;
  if (!apps || !apps[slug]) return null;
  const source = apps[slug].source as string | undefined;
  if (!source) return null;
  if (!fs.existsSync(source)) return null;
  return source;
}

function loadWorkflowSteps(slug: string): Array<{ order: number; name: string; instruction: string }> | null {
  const workflowPath = path.join(HARNESS_PATH, 'core', 'workflows', `${slug}.yaml`);
  const parsed = parseYamlFile(workflowPath) as Record<string, unknown> | null;
  if (!parsed || !parsed.steps) return null;
  return (parsed.steps as Array<Record<string, unknown>>).map(s => ({
    order: s.order as number,
    name: s.name as string,
    instruction: s.instruction as string,
  }));
}

async function runWorkflowJob(job: WorkflowJob) {
  job.status = 'running';
  const sourceDir = getPackageSource(job.target);

  if (!sourceDir) {
    job.status = 'error';
    job.error = `No source directory found for package "${job.target}". Add 'source' field to harness.yaml apps.`;
    job.completedAt = Date.now();
    emitWorkflowEvent(job.id, { type: 'error', text: job.error });
    emitWorkflowEvent(job.id, { type: 'done', status: 'error' });
    return;
  }

  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const distName = (harnessYaml?.distribution as string) ?? 'harness.os';

  for (let i = 0; i < job.phases.length; i++) {
    const phase = job.phases[i];
    phase.status = 'running';
    job.currentPhase = phase.name;
    emitWorkflowEvent(job.id, { type: 'phase', name: phase.name, status: 'running', index: i });

    const phasePrompt = [
      `You are an agent in ${distName} running phase "${phase.name}" of the software development process.`,
      `\nFEATURE REQUEST: ${job.request}`,
      `\nTARGET: ${job.target} (source at: ${sourceDir})`,
      `\nPHASE INSTRUCTION: ${phase.instruction}`,
      `\nIMPORTANT: Stay focused on this phase only. Be concise. Follow existing code patterns.`,
      phase.name === 'deploy' ? `\nDo NOT push or deploy. Only stage changes (git add) and summarize what was done.` : '',
    ].join('');

    const systemPrompt = [
      `You are a development agent working on the "${job.target}" package.`,
      `Current phase: ${phase.name} (${i + 1}/${job.phases.length}).`,
      `Work in: ${sourceDir}`,
      `Keep changes minimal and focused. Follow existing patterns.`,
    ].join(' ');

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('claude', [
          '-p', phasePrompt,
          '--output-format', 'stream-json',
          '--verbose',
          '--system-prompt', systemPrompt,
          '--max-turns', '20',
          '--dangerously-skip-permissions',
        ], {
          cwd: sourceDir,
          env: { ...process.env, HOME: process.env.HOME },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let buffer = '';
        let lastTextLen = 0;

        child.stdout.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'assistant' && event.message?.content) {
                for (const block of event.message.content) {
                  if (block.type === 'text' && block.text.length > lastTextLen) {
                    const delta = block.text.slice(lastTextLen);
                    lastTextLen = block.text.length;
                    job.logs.push({ phase: phase.name, text: delta, ts: Date.now() });
                    emitWorkflowEvent(job.id, { type: 'log', phase: phase.name, text: delta });
                  }
                }
              } else if (event.type === 'result' && event.result) {
                if (lastTextLen === 0) {
                  job.logs.push({ phase: phase.name, text: event.result, ts: Date.now() });
                  emitWorkflowEvent(job.id, { type: 'log', phase: phase.name, text: event.result });
                }
              }
            } catch { /* skip non-JSON */ }
          }
        });

        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString().trim();
          if (text) {
            job.logs.push({ phase: phase.name, text: `[stderr] ${text}`, ts: Date.now() });
          }
        });

        child.on('close', (code) => {
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer);
              if (event.type === 'result' && event.result && lastTextLen === 0) {
                job.logs.push({ phase: phase.name, text: event.result, ts: Date.now() });
                emitWorkflowEvent(job.id, { type: 'log', phase: phase.name, text: event.result });
              }
            } catch { /* ignore */ }
          }
          if (code !== 0 && code !== null) {
            reject(new Error(`Agent exited with code ${code}`));
          } else {
            resolve();
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn agent: ${err.message}`));
        });
      });

      phase.status = 'done';
      emitWorkflowEvent(job.id, { type: 'phase', name: phase.name, status: 'done', index: i });
    } catch (err) {
      phase.status = 'error';
      job.status = 'error';
      job.error = (err as Error).message;
      job.completedAt = Date.now();
      emitWorkflowEvent(job.id, { type: 'phase', name: phase.name, status: 'error', index: i });
      emitWorkflowEvent(job.id, { type: 'error', text: job.error });
      emitWorkflowEvent(job.id, { type: 'done', status: 'error' });
      return;
    }
  }

  job.status = 'complete';
  job.completedAt = Date.now();
  emitWorkflowEvent(job.id, { type: 'done', status: 'complete' });
}

// POST /api/workflow/run — trigger a workflow execution
app.post('/api/workflow/run', (req, res) => {
  const { workflow, target, request } = req.body as { workflow?: string; target?: string; request?: string };

  if (!target || !request) {
    return res.status(400).json({ error: 'target and request are required' });
  }

  const workflowSlug = workflow || 'software-dev-process';
  const steps = loadWorkflowSteps(workflowSlug);
  if (!steps) {
    return res.status(404).json({ error: `Workflow "${workflowSlug}" not found` });
  }

  // Validate target package exists in harness.yaml
  const source = getPackageSource(target);
  if (!source) {
    return res.status(400).json({ error: `Package "${target}" has no source path configured in harness.yaml` });
  }

  const jobId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: WorkflowJob = {
    id: jobId,
    workflow: workflowSlug,
    target,
    request: request.slice(0, 2000), // cap request length for safety
    status: 'queued',
    currentPhase: '',
    phases: steps.map(s => ({ name: s.name, status: 'pending' as const, instruction: s.instruction })),
    logs: [],
    startedAt: Date.now(),
  };

  workflowJobs.set(jobId, job);
  workflowListeners.set(jobId, new Set());

  // Run async — don't block the response
  runWorkflowJob(job);

  return res.status(202).json({ jobId, phases: job.phases.map(p => p.name) });
});

// GET /api/workflow/stream/:jobId — SSE stream with catch-up
app.get('/api/workflow/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = workflowJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Catch-up: replay current state
  res.write(`data: ${JSON.stringify({ type: 'state', job: { ...job, logs: undefined } })}\n\n`);
  for (const log of job.logs) {
    res.write(`data: ${JSON.stringify({ type: 'log', phase: log.phase, text: log.text })}\n\n`);
  }

  if (job.status === 'complete' || job.status === 'error') {
    res.write(`data: ${JSON.stringify({ type: 'done', status: job.status })}\n\n`);
    res.end();
    return;
  }

  // Subscribe to future events
  const send = (data: string) => { res.write(data); };
  const listeners = workflowListeners.get(jobId)!;
  listeners.add(send);

  req.on('close', () => {
    listeners.delete(send);
  });
});

// GET /api/workflow/jobs — list all jobs
app.get('/api/workflow/jobs', (_req, res) => {
  const jobs = Array.from(workflowJobs.values()).map(j => ({
    id: j.id,
    workflow: j.workflow,
    target: j.target,
    request: j.request,
    status: j.status,
    currentPhase: j.currentPhase,
    phases: j.phases.map(p => ({ name: p.name, status: p.status })),
    startedAt: j.startedAt,
    completedAt: j.completedAt,
    error: j.error,
  }));
  res.json(jobs);
});

// POST /api/workflow/cancel/:jobId — cancel a running job
app.post('/api/workflow/cancel/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = workflowJobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'running' && job.status !== 'queued') {
    return res.status(400).json({ error: 'Job is not running' });
  }
  job.status = 'error';
  job.error = 'Cancelled by user';
  job.completedAt = Date.now();
  emitWorkflowEvent(jobId, { type: 'error', text: 'Cancelled by user' });
  emitWorkflowEvent(jobId, { type: 'done', status: 'error' });
  return res.json({ cancelled: true });
});

// --- MCP Connection Manager ---

const mcpManager = new McpManager();

mcpManager.on('connected', (slug: string, tools: unknown[]) => {
  console.log(`[mcp] ${slug} connected (${tools.length} tools)`);
  broadcast({ type: 'invalidate', queryKeys: [['mcp', 'status']] });
});

mcpManager.on('disconnected', (slug: string) => {
  console.log(`[mcp] ${slug} disconnected`);
  broadcast({ type: 'invalidate', queryKeys: [['mcp', 'status']] });
});

mcpManager.on('error', (slug: string, err: Error) => {
  console.error(`[mcp] ${slug} error:`, err.message);
});

mcpManager.on('log', (slug: string, text: string) => {
  console.log(`[mcp:${slug}]`, text);
});

function loadPackageManifest(manifestPath: string): PackageManifest | null {
  const raw = safeReadFile(manifestPath);
  if (!raw) return null;
  try {
    return yaml.load(raw) as PackageManifest;
  } catch { return null; }
}

function getPackageManifestPath(slug: string): string | null {
  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const apps = harnessYaml?.apps as Record<string, Record<string, unknown>> | undefined;
  if (!apps || !apps[slug]) return null;
  return (apps[slug].package as string) ?? null;
}

async function bootMcpServers() {
  const harnessYaml = parseYamlFile(path.join(HARNESS_PATH, 'harness.yaml')) as Record<string, unknown> | null;
  const apps = harnessYaml?.apps as Record<string, Record<string, unknown>> | undefined;
  if (!apps) return;

  for (const [slug, config] of Object.entries(apps)) {
    const manifestPath = config.package as string | undefined;
    if (!manifestPath) continue;

    const manifest = loadPackageManifest(manifestPath);
    if (!manifest?.mcp) continue;

    try {
      await mcpManager.startServer(slug, manifest);
    } catch (err) {
      console.error(`[mcp] Failed to boot ${slug}:`, (err as Error).message);
    }
  }
}

// MCP proxy: call a tool on a connected MCP server
app.post('/api/mcp/call', async (req, res) => {
  const { server, tool, args } = req.body as { server: string; tool: string; args?: Record<string, unknown> };

  if (!server || !tool) {
    return res.status(400).json({ error: 'server and tool are required' });
  }

  const conn = mcpManager.getConnection(server);
  if (!conn) {
    // Try lazy start
    const manifestPath = getPackageManifestPath(server);
    if (manifestPath) {
      const manifest = loadPackageManifest(manifestPath);
      if (manifest?.mcp) {
        try {
          await mcpManager.startServer(server, manifest);
        } catch (err) {
          return res.status(503).json({ error: `Failed to start MCP server: ${(err as Error).message}` });
        }
      }
    }

    const retryConn = mcpManager.getConnection(server);
    if (!retryConn || retryConn.status !== 'ready') {
      return res.status(503).json({ error: `MCP server "${server}" not available` });
    }
  } else if (conn.status !== 'ready') {
    return res.status(503).json({ error: `MCP server "${server}" not ready (status: ${conn.status})` });
  }

  try {
    const raw = await mcpManager.callTool(server, tool, args || {}) as { content?: Array<{ type: string; text: string }>; isError?: boolean };
    // MCP tools return { content: [{ type: 'text', text: '...' }] } — extract and parse
    if (raw?.content && Array.isArray(raw.content)) {
      const text = raw.content.filter(c => c.type === 'text').map(c => c.text).join('');
      if (raw.isError) {
        return res.status(500).json({ error: text });
      }
      try {
        res.json({ result: JSON.parse(text) });
      } catch {
        res.json({ result: text });
      }
    } else {
      res.json({ result: raw });
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// MCP status: list all connected servers and their tools
app.get('/api/mcp/status', (_req, res) => {
  const connections = mcpManager.getAllConnections().map(c => ({
    slug: c.slug,
    status: c.status,
    tools: c.tools.map(t => ({ name: t.name, description: t.description })),
    error: c.error,
  }));
  res.json({ connections });
});

// MCP tools: list tools for a specific server
app.get('/api/mcp/tools/:server', (req, res) => {
  const conn = mcpManager.getConnection(req.params.server);
  if (!conn) return res.status(404).json({ error: 'Server not found' });
  res.json({ tools: conn.tools, status: conn.status });
});

// --- File Watcher (chokidar) ---

function pathToQueryKeys(filePath: string): string[][] {
  const rel = path.relative(HARNESS_PATH, filePath);
  const keys: string[][] = [];

  if (rel.startsWith('core/knowledge')) keys.push(['knowledge'], ['health']);
  else if (rel.startsWith('core/rules')) keys.push(['rules'], ['health']);
  else if (rel.startsWith('core/workflows')) keys.push(['workflows'], ['health']);
  else if (rel.startsWith('core/learnings')) keys.push(['learnings'], ['health']);
  else if (rel.startsWith('core/decisions')) keys.push(['decisions'], ['health']);
  else if (rel.startsWith('product/sessions')) keys.push(['sessions']);
  else if (rel.startsWith('mesh/agents')) keys.push(['mesh', 'agents']);
  else if (rel.startsWith('.events')) keys.push(['mesh', 'events']);
  else if (rel.includes('audit')) keys.push(['audit']);
  else keys.push(['health']);

  return keys;
}

const watcher = watch(HARNESS_PATH, {
  ignoreInitial: true,
  persistent: true,
  depth: 5,
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingKeys: string[][] = [];

watcher.on('all', (_event, filePath) => {
  const keys = pathToQueryKeys(filePath);
  pendingKeys.push(...keys);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const unique = Array.from(new Map(pendingKeys.map((k) => [k.join('/'), k])).values());
    broadcast({ type: 'invalidate', queryKeys: unique });
    pendingKeys = [];
  }, 200);
});

// Serve built frontend
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

server.listen(PORT, () => {
  const name = path.basename(HARNESS_PATH);
  console.log(`[${name}] http://localhost:${PORT}`);

  // Boot MCP servers for installed packages
  bootMcpServers().catch(err => {
    console.error('[mcp] Boot error:', err.message);
  });
});
