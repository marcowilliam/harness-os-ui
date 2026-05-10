import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowsApp } from './WorkflowsApp';

vi.mock('../../api/hooks', () => ({
  useWorkflows: () => ({
    data: [
      {
        slug: 'software-dev-process',
        name: 'Software Development Process',
        type: 'build',
        status: 'active',
        triggers: ['feature', 'improvement'],
        steps: [
          { order: 1, name: 'parse', instruction: 'Understand the request.' },
          { order: 2, name: 'plan', instruction: 'Design the approach.' },
        ],
      },
    ],
    isLoading: false,
  }),
  useAgents: () => ({
    data: [
      {
        slug: 'os-agent',
        name: 'OS Agent',
        type: 'orchestrator',
        status: 'active',
        surface: 'assistant',
        capabilities: ['orchestrate', 'delegate'],
        access: {
          level: 'inner-harness',
          read: { domains: '*' },
          write: { domains: '*' },
          sudo: { enabled: true },
        },
      },
    ],
    isLoading: false,
  }),
  useWorkflowJobs: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('../../store', () => ({
  useStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      packageApps: [
        { slug: 'way2fly', name: 'way2fly.ai', icon: 'parachute', color: '#818cf8', description: 'AI skydive' },
      ],
      activeWorkflowJob: null,
      setActiveWorkflowJob: vi.fn(),
    };
    return selector(state);
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('WorkflowsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three tabs', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Workflows')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
  });

  it('shows Active tab content by default', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    expect(screen.getByText('Target')).toBeInTheDocument();
  });

  it('switches to Workflows tab and shows workflow definitions', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Workflows'));
    expect(screen.getByText('Software Development Process')).toBeInTheDocument();
    expect(screen.getByText('software-dev-process')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('shows workflow triggers on Workflows tab', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Workflows'));
    expect(screen.getByText('feature')).toBeInTheDocument();
    expect(screen.getByText('improvement')).toBeInTheDocument();
  });

  it('shows workflow steps on Workflows tab', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Workflows'));
    expect(screen.getByText('Understand the request.')).toBeInTheDocument();
    expect(screen.getByText('Design the approach.')).toBeInTheDocument();
  });

  it('switches to Agents tab and shows agent cards', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Agents'));
    expect(screen.getByText('OS Agent')).toBeInTheDocument();
    expect(screen.getByText('os-agent')).toBeInTheDocument();
  });

  it('shows agent capabilities and access level', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Agents'));
    expect(screen.getByText('inner harness')).toBeInTheDocument();
    expect(screen.getByText('orchestrate')).toBeInTheDocument();
    expect(screen.getByText('delegate')).toBeInTheDocument();
  });

  it('shows installed packages as trigger targets', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    expect(screen.getByText('way2fly.ai')).toBeInTheDocument();
  });

  it('shows placeholder text when no package is selected', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText('Select a target package first')).toBeInTheDocument();
  });

  it('updates placeholder after selecting a package target', () => {
    render(<WorkflowsApp />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('way2fly.ai'));
    expect(screen.getByPlaceholderText('Describe feature for way2fly... (Cmd+Enter)')).toBeInTheDocument();
  });
});
