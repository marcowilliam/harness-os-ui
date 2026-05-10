import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpConnection {
  slug: string;
  process: ChildProcess;
  status: 'starting' | 'ready' | 'error' | 'stopped';
  tools: McpTool[];
  error?: string;
}

export interface PackageManifest {
  name: string;
  mcp?: {
    server: string;
    transport: string;
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
  };
  assistant?: {
    system_prompt: string;
    placeholder: string;
  };
  appearance?: {
    icon: string;
    color: string;
    label: string;
  };
  capabilities?: string[];
}

export class McpManager extends EventEmitter {
  private connections = new Map<string, McpConnection>();
  private requestId = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private buffers = new Map<string, string>();

  getConnection(slug: string): McpConnection | undefined {
    return this.connections.get(slug);
  }

  getAllConnections(): McpConnection[] {
    return Array.from(this.connections.values());
  }

  async startServer(slug: string, manifest: PackageManifest): Promise<McpConnection> {
    if (this.connections.has(slug)) {
      const existing = this.connections.get(slug)!;
      if (existing.status === 'ready') return existing;
      this.stopServer(slug);
    }

    const mcp = manifest.mcp;
    if (!mcp) throw new Error(`Package ${slug} has no MCP configuration`);

    const cwd = mcp.cwd || process.cwd();
    const env: Record<string, string> = { ...process.env as Record<string, string> };
    if (mcp.env) Object.assign(env, mcp.env);

    const child = spawn(mcp.command, mcp.args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const conn: McpConnection = {
      slug,
      process: child,
      status: 'starting',
      tools: [],
    };

    this.connections.set(slug, conn);
    this.buffers.set(slug, '');

    child.stdout.on('data', (chunk: Buffer) => {
      this.handleStdout(slug, chunk.toString());
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) this.emit('log', slug, `[stderr] ${text}`);
    });

    child.on('close', (code) => {
      conn.status = 'stopped';
      conn.error = code ? `Process exited with code ${code}` : undefined;
      this.emit('disconnected', slug, code);
    });

    child.on('error', (err) => {
      conn.status = 'error';
      conn.error = err.message;
      this.emit('error', slug, err);
    });

    try {
      await this.initialize(slug);
      const tools = await this.listTools(slug);
      conn.tools = tools;
      conn.status = 'ready';
      this.emit('connected', slug, tools);
      return conn;
    } catch (err) {
      conn.status = 'error';
      conn.error = (err as Error).message;
      this.emit('error', slug, err);
      throw err;
    }
  }

  stopServer(slug: string) {
    const conn = this.connections.get(slug);
    if (!conn) return;
    conn.status = 'stopped';
    conn.process.kill();
    this.connections.delete(slug);
    this.buffers.delete(slug);
  }

  async callTool(slug: string, toolName: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const conn = this.connections.get(slug);
    if (!conn || conn.status !== 'ready') {
      throw new Error(`MCP server "${slug}" is not connected (status: ${conn?.status ?? 'unknown'})`);
    }

    const result = await this.sendRequest(slug, 'tools/call', {
      name: toolName,
      arguments: args,
    });

    return result;
  }

  private async initialize(slug: string): Promise<void> {
    await this.sendRequest(slug, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'harness-os', version: '1.0.0' },
    });

    this.sendNotification(slug, 'notifications/initialized', {});
  }

  private async listTools(slug: string): Promise<McpTool[]> {
    const result = await this.sendRequest(slug, 'tools/list', {}) as { tools: McpTool[] };
    return result.tools || [];
  }

  private sendRequest(slug: string, method: string, params: Record<string, unknown>): Promise<unknown> {
    const conn = this.connections.get(slug);
    if (!conn) throw new Error(`No connection for ${slug}`);

    const id = ++this.requestId;
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timeout: ${method} (id: ${id})`));
      }, 30_000);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      conn.process.stdin!.write(message + '\n');
    });
  }

  private sendNotification(slug: string, method: string, params: Record<string, unknown>) {
    const conn = this.connections.get(slug);
    if (!conn) return;

    const message = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });

    conn.process.stdin!.write(message + '\n');
  }

  private handleStdout(slug: string, data: string) {
    const buffer = (this.buffers.get(slug) || '') + data;
    const lines = buffer.split('\n');
    this.buffers.set(slug, lines.pop() || '');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if ('id' in msg && msg.id != null) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error.message || 'MCP error'));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      } catch {
        // not valid JSON-RPC
      }
    }
  }

  shutdown() {
    for (const [slug] of this.connections) {
      this.stopServer(slug);
    }
  }
}
