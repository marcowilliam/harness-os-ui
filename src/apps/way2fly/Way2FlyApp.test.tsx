import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Way2FlyApp } from './Way2FlyApp';

// Mock the store
vi.mock('../../store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      appData: {
        way2fly: {
          get_stats: { stats: { totalDebriefs: 12, totalMarkers: 45, disciplines: [{ id: 'bff', debriefCount: 8 }], lastDebrief: { date: '2026-05-01', focus: 'Head-down' } } },
          get_debriefs: { debriefs: [
            { id: 'deb-1', jumpFocus: 'Head-down practice', summaryText: 'Good session', status: 'shared', createdAt: '2026-05-01T10:00:00Z', skillIds: ['s1'] },
            { id: 'deb-2', jumpFocus: 'Back fly basics', summaryText: null, status: 'draft', createdAt: '2026-04-28T10:00:00Z', skillIds: [] },
          ] },
        },
      },
      setAppData: vi.fn(),
      clearAppData: vi.fn(),
      activeApp: 'pkg:way2fly',
      packageApps: [{ slug: 'way2fly', name: 'way2fly.ai', icon: 'parachute', color: '#818cf8', description: 'test' }],
    };
    return selector(state);
  }),
}));

// Mock the MCP hook
const mockMutate = vi.fn();
vi.mock('../../api/useMcp', () => ({
  useMcpCall: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('Way2FlyApp', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('renders stats bar with debrief count', async () => {
    render(<Way2FlyApp />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('debriefs')).toBeInTheDocument();
    });
  });

  it('renders stats bar with marker count', async () => {
    render(<Way2FlyApp />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('markers')).toBeInTheDocument();
    });
  });

  it('renders debrief list with items', async () => {
    render(<Way2FlyApp />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('Head-down practice')).toBeInTheDocument();
      expect(screen.getByText('Back fly basics')).toBeInTheDocument();
    });
  });

  it('shows shared badge for shared debriefs', async () => {
    render(<Way2FlyApp />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText('shared')).toBeInTheDocument();
    });
  });

  it('calls get_stats and get_debriefs on mount', () => {
    render(<Way2FlyApp />, { wrapper });
    expect(mockMutate).toHaveBeenCalledWith({ tool: 'get_stats' });
    expect(mockMutate).toHaveBeenCalledWith(
      { tool: 'get_debriefs', args: { limit: 20 } },
      expect.any(Object)
    );
  });

  it('calls get_debrief when clicking a debrief', async () => {
    render(<Way2FlyApp />, { wrapper });
    const item = await screen.findByText('Head-down practice');
    item.closest('button')?.click();
    expect(mockMutate).toHaveBeenCalledWith({ tool: 'get_debrief', args: { id: 'deb-1' } });
  });
});
