import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';

export interface McpToolResult {
  result: unknown;
}

export interface McpServerStatus {
  slug: string;
  status: 'starting' | 'ready' | 'error' | 'stopped';
  tools: Array<{ name: string; description: string }>;
  error?: string;
}

export function useMcpStatus() {
  return useQuery<{ connections: McpServerStatus[] }>({
    queryKey: ['mcp', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/mcp/status');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export function useMcpTools(server: string) {
  return useQuery<{ tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>; status: string }>({
    queryKey: ['mcp', 'tools', server],
    queryFn: async () => {
      const res = await fetch(`/api/mcp/tools/${server}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: !!server,
  });
}

export function useMcpCall(server: string) {
  const queryClient = useQueryClient();
  const setAppData = useStore((s) => s.setAppData);

  return useMutation<McpToolResult, Error, { tool: string; args?: Record<string, unknown> }>({
    mutationFn: async ({ tool, args }) => {
      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, tool, args: args || {} }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `MCP call failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Store the result in appData so the package component can render it
      setAppData(server, variables.tool, data.result);
      queryClient.invalidateQueries({ queryKey: ['mcp', 'status'] });
    },
  });
}
