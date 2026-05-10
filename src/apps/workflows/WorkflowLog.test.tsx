import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkflowLog } from './WorkflowLog';

describe('WorkflowLog', () => {
  it('shows empty state when no logs and not running', () => {
    render(<WorkflowLog logs={[]} isRunning={false} />);
    expect(screen.getByText('No logs yet. Trigger a workflow to see output here.')).toBeInTheDocument();
  });

  it('renders log entries with phase labels', () => {
    const logs = [
      { phase: 'parse', text: 'Reading files...' },
      { phase: 'plan', text: 'Designing approach...' },
    ];
    render(<WorkflowLog logs={logs} isRunning={false} />);
    expect(screen.getByText('parse')).toBeInTheDocument();
    expect(screen.getByText('Reading files...')).toBeInTheDocument();
    expect(screen.getByText('plan')).toBeInTheDocument();
    expect(screen.getByText('Designing approach...')).toBeInTheDocument();
  });

  it('shows working indicator when running', () => {
    render(<WorkflowLog logs={[{ phase: 'build', text: 'Starting...' }]} isRunning={true} />);
    expect(screen.getByText('Agent working...')).toBeInTheDocument();
  });

  it('does not show working indicator when not running', () => {
    render(<WorkflowLog logs={[{ phase: 'build', text: 'Done' }]} isRunning={false} />);
    expect(screen.queryByText('Agent working...')).not.toBeInTheDocument();
  });

  it('renders multiple log entries in order', () => {
    const logs = [
      { phase: 'parse', text: 'Step 1' },
      { phase: 'parse', text: 'Step 2' },
      { phase: 'build', text: 'Step 3' },
    ];
    const { container } = render(<WorkflowLog logs={logs} isRunning={false} />);
    const texts = container.querySelectorAll('[style*="pre-wrap"]');
    expect(texts[0].textContent).toBe('Step 1');
    expect(texts[1].textContent).toBe('Step 2');
    expect(texts[2].textContent).toBe('Step 3');
  });
});
