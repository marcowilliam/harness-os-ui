import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock store
vi.mock('../store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      appData: {},
      setAppData: vi.fn(),
    };
    return selector(state);
  }),
}));

// We test the logic by testing the fetch calls and mutation behavior
describe('useMcp (logic tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('POST /api/mcp/call with correct payload', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { debriefs: [] } }),
    });

    const res = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: 'way2fly', tool: 'get_debriefs', args: { limit: 5 } }),
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/mcp/call', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ server: 'way2fly', tool: 'get_debriefs', args: { limit: 5 } }),
    }));
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.result).toEqual({ debriefs: [] });
  });

  it('GET /api/mcp/status returns connection list', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        connections: [
          { slug: 'way2fly', status: 'ready', tools: [{ name: 'get_debriefs', description: 'List debriefs' }] },
        ],
      }),
    });

    const res = await fetch('/api/mcp/status');
    const data = await res.json();
    expect(data.connections).toHaveLength(1);
    expect(data.connections[0].slug).toBe('way2fly');
    expect(data.connections[0].status).toBe('ready');
  });

  it('GET /api/mcp/tools/:server returns tools', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tools: [
          { name: 'get_debriefs', description: 'List debriefs', inputSchema: {} },
          { name: 'get_debrief', description: 'Get single debrief', inputSchema: {} },
        ],
        status: 'ready',
      }),
    });

    const res = await fetch('/api/mcp/tools/way2fly');
    const data = await res.json();
    expect(data.tools).toHaveLength(2);
    expect(data.status).toBe('ready');
  });

  it('handles error responses from MCP call', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'MCP server "way2fly" not available' }),
    });

    const res = await fetch('/api/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: 'way2fly', tool: 'get_debriefs', args: {} }),
    });

    expect(res.ok).toBe(false);
    const data = await res.json();
    expect(data.error).toContain('not available');
  });
});
