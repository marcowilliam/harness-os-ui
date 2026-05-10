import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebriefDetail } from './DebriefDetail';

const mockDebrief = {
  id: 'deb-123',
  jumpFocus: 'Head-down exit',
  summaryText: 'Clean exit, stable head-down within 3 seconds.',
  createdAt: '2026-05-01T10:00:00Z',
  video: { id: 'vid-1', durationMs: 65000, is360: false },
  markers: [
    { id: 'm1', timestampMs: 3000, endTimestampMs: null, label: 'Exit', text: 'Good push', skillId: null, participantId: null },
    { id: 'm2', timestampMs: 8000, endTimestampMs: null, label: 'Head-down', text: null, skillId: 'sk1', participantId: null },
    { id: 'm3', timestampMs: 45000, endTimestampMs: null, label: 'Breakoff', text: 'Clean turn', skillId: null, participantId: null },
  ],
  participants: [
    { displayName: 'Marco', displayOrder: 0 },
    { displayName: 'Coach Dan', displayOrder: 1 },
  ],
};

describe('DebriefDetail', () => {
  it('renders loading state', () => {
    render(<DebriefDetail debrief={undefined} onBack={vi.fn()} loading />);
    // Should show spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders debrief title', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('Head-down exit')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('← back')).toBeInTheDocument();
  });

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn();
    render(<DebriefDetail debrief={mockDebrief} onBack={onBack} />);
    screen.getByText('← back').click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders video duration', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('renders AI summary', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('Clean exit, stable head-down within 3 seconds.')).toBeInTheDocument();
  });

  it('renders markers with timestamps', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('0:03')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(screen.getByText('Good push')).toBeInTheDocument();
    expect(screen.getByText('Breakoff')).toBeInTheDocument();
  });

  it('renders marker count', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('Markers (3)')).toBeInTheDocument();
  });

  it('renders participants', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('Marco')).toBeInTheDocument();
    expect(screen.getByText('Coach Dan')).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<DebriefDetail debrief={mockDebrief} onBack={vi.fn()} />);
    expect(screen.getByText('5/1/2026')).toBeInTheDocument();
  });
});
