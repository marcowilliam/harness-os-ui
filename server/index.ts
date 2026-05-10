import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'chokidar';

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

  jsonT(res, {
    status: 'ok',
    backend: 'file',
    harnessPath: HARNESS_PATH,
    distribution,
    projects,
    brand,
    capabilities,
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
});
