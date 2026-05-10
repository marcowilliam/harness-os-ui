import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PipelineView } from './PipelineView';

describe('PipelineView', () => {
  const defaultPhases = [
    { name: 'parse', status: 'pending' as const },
    { name: 'plan', status: 'pending' as const },
    { name: 'build', status: 'pending' as const },
    { name: 'test', status: 'pending' as const },
    { name: 'fix', status: 'pending' as const },
    { name: 'improve', status: 'pending' as const },
    { name: 'deploy', status: 'pending' as const },
  ];

  it('renders all phase names', () => {
    render(<PipelineView phases={defaultPhases} currentPhase="" />);
    for (const phase of defaultPhases) {
      expect(screen.getByText(phase.name)).toBeInTheDocument();
    }
  });

  it('shows checkmark for done phases', () => {
    const phases = [
      { name: 'parse', status: 'done' as const },
      { name: 'plan', status: 'running' as const },
      { name: 'build', status: 'pending' as const },
    ];
    render(<PipelineView phases={phases} currentPhase="plan" />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows error marker for failed phases', () => {
    const phases = [
      { name: 'parse', status: 'done' as const },
      { name: 'plan', status: 'error' as const },
      { name: 'build', status: 'pending' as const },
    ];
    render(<PipelineView phases={phases} currentPhase="plan" />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('renders connector lines between phases', () => {
    const phases = [
      { name: 'parse', status: 'done' as const },
      { name: 'plan', status: 'running' as const },
    ];
    const { container } = render(<PipelineView phases={phases} currentPhase="plan" />);
    const connectors = container.querySelectorAll('.w-3.h-px');
    expect(connectors.length).toBe(1);
  });

  it('shows pulse indicator on active phase', () => {
    const phases = [
      { name: 'parse', status: 'done' as const },
      { name: 'plan', status: 'running' as const },
      { name: 'build', status: 'pending' as const },
    ];
    const { container } = render(<PipelineView phases={phases} currentPhase="plan" />);
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });

  it('does not show pulse when no phase is active', () => {
    const phases = [
      { name: 'parse', status: 'done' as const },
      { name: 'plan', status: 'done' as const },
    ];
    const { container } = render(<PipelineView phases={phases} currentPhase="" />);
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).not.toBeInTheDocument();
  });
});
