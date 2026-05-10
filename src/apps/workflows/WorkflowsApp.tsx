import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkflows, useAgents, useWorkflowJobs } from '../../api/hooks';
import { useStore } from '../../store';
import { PipelineView } from './PipelineView';
import { WorkflowLog } from './WorkflowLog';
import type { MeshAgent, AgentAccess, Workflow } from '../../lib/types';

type Tab = 'active' | 'workflows' | 'agents';

// ── Tab Button ────────────────────────────────────────────────────

function TabBtn({ active, onClick, label, badge }: {
  id?: string; active: boolean; onClick: () => void; label: string; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5"
      style={{
        background: active ? 'var(--color-kernel-soft)' : 'transparent',
        color: active ? 'var(--color-kernel)' : 'var(--color-os-text-muted)',
        border: `1px solid ${active ? 'var(--color-kernel-glow)' : 'transparent'}`,
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: 'var(--color-kernel)', color: '#fff' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Active Execution Panel ────────────────────────────────────────

interface LogEntry { phase: string; text: string }
interface PhaseState { name: string; status: 'pending' | 'running' | 'done' | 'error' }

function ActiveExecution() {
  const { data: jobs = [] } = useWorkflowJobs();
  const packageApps = useStore((s) => s.packageApps);
  const activeWorkflowJob = useStore((s) => s.activeWorkflowJob);
  const setActiveWorkflowJob = useStore((s) => s.setActiveWorkflowJob);

  const [phases, setPhases] = useState<PhaseState[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPhase, setCurrentPhase] = useState('');
  const [jobStatus, setJobStatus] = useState<string>('');
  const [triggerPkg, setTriggerPkg] = useState<string>('');
  const [triggerRequest, setTriggerRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToJob = useCallback((jobId: string) => {
    eventSourceRef.current?.close();
    setLogs([]);
    setPhases([]);
    setCurrentPhase('');
    setJobStatus('running');

    const es = new EventSource(`/api/workflow/stream/${jobId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setPhases(data.job.phases);
          setCurrentPhase(data.job.currentPhase);
          setJobStatus(data.job.status);
        } else if (data.type === 'phase') {
          setPhases(prev => prev.map((p, i) =>
            i === data.index ? { ...p, status: data.status } : p
          ));
          if (data.status === 'running') setCurrentPhase(data.name);
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, { phase: data.phase, text: data.text }]);
        } else if (data.type === 'done') {
          setJobStatus(data.status);
          es.close();
        } else if (data.type === 'error') {
          setLogs(prev => [...prev, { phase: 'error', text: data.text }]);
          setJobStatus('error');
        }
      } catch { /* skip */ }
    };

    es.onerror = () => {
      es.close();
    };
  }, []);

  const prevJobRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeWorkflowJob && activeWorkflowJob !== prevJobRef.current) {
      prevJobRef.current = activeWorkflowJob;
      connectToJob(activeWorkflowJob);
    }
    return () => { eventSourceRef.current?.close(); };
  }, [activeWorkflowJob, connectToJob]);

  // Auto-connect to most recent running job on mount
  useEffect(() => {
    if (!activeWorkflowJob && jobs.length > 0) {
      const running = jobs.find(j => j.status === 'running' || j.status === 'queued');
      if (running) {
        setActiveWorkflowJob(running.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length]);

  const handleTrigger = async () => {
    if (!triggerPkg || !triggerRequest.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: 'software-dev-process',
          target: triggerPkg,
          request: triggerRequest.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setLogs([{ phase: 'error', text: err.error || 'Failed to start workflow' }]);
        setJobStatus('error');
      } else {
        const { jobId, phases: phaseNames } = await res.json();
        setActiveWorkflowJob(jobId);
        setPhases(phaseNames.map((name: string) => ({ name, status: 'pending' })));
        setTriggerRequest('');
        connectToJob(jobId);
      }
    } catch {
      setLogs([{ phase: 'error', text: 'Network error — is the server running?' }]);
      setJobStatus('error');
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!activeWorkflowJob) return;
    await fetch(`/api/workflow/cancel/${activeWorkflowJob}`, { method: 'POST' });
  };

  const isRunning = jobStatus === 'running' || jobStatus === 'queued';

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline */}
      {phases.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--color-os-border-subtle)' }}>
          <PipelineView phases={phases} currentPhase={currentPhase} />
        </div>
      )}

      {/* Job info bar */}
      {activeWorkflowJob && (
        <div
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ borderBottom: '1px solid var(--color-os-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
              {activeWorkflowJob.slice(0, 16)}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                color: jobStatus === 'complete' ? 'var(--color-active)'
                  : jobStatus === 'error' ? 'var(--color-error)'
                  : 'var(--color-kernel)',
                background: jobStatus === 'complete' ? 'rgba(16,185,129,0.08)'
                  : jobStatus === 'error' ? 'rgba(239,68,68,0.08)'
                  : 'var(--color-kernel-soft)',
              }}
            >
              {jobStatus}
            </span>
          </div>
          {isRunning && (
            <button
              onClick={handleCancel}
              className="text-[10px] px-2 py-1 rounded transition-colors"
              style={{ color: 'var(--color-error)', background: 'rgba(239,68,68,0.08)' }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 overflow-hidden">
        <WorkflowLog logs={logs} isRunning={isRunning} />
      </div>

      {/* Trigger input */}
      {!isRunning && (
        <div
          className="shrink-0 px-4 py-3 space-y-2"
          style={{ borderTop: '1px solid var(--color-os-border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold shrink-0"
              style={{ color: 'var(--color-os-text-muted)' }}>
              Target
            </span>
            {packageApps.length === 0 ? (
              <span className="text-[10px]" style={{ color: 'var(--color-os-text-muted)' }}>
                No packages installed — use terminal: install &lt;slug&gt;
              </span>
            ) : (
              packageApps.map((pkg) => (
                <button
                  key={pkg.slug}
                  onClick={() => setTriggerPkg(pkg.slug)}
                  className="text-[10px] px-2 py-1 rounded-md transition-all font-medium"
                  style={{
                    background: triggerPkg === pkg.slug ? `${pkg.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${triggerPkg === pkg.slug ? pkg.color : 'var(--color-os-border)'}`,
                    color: triggerPkg === pkg.slug ? pkg.color : 'var(--color-os-text-secondary)',
                  }}
                >
                  {pkg.name}
                </button>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.5 }}>⚡</span>
            <input
              type="text"
              value={triggerRequest}
              onChange={(e) => setTriggerRequest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleTrigger();
              }}
              placeholder={triggerPkg ? `Describe feature for ${triggerPkg}... (Cmd+Enter)` : 'Select a target package first'}
              disabled={!triggerPkg || submitting}
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: 'var(--color-os-text)', opacity: triggerPkg ? 1 : 0.4 }}
            />
            {triggerRequest.trim() && triggerPkg && (
              <button
                onClick={handleTrigger}
                disabled={submitting}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ color: 'var(--color-kernel)', background: 'var(--color-kernel-soft)' }}
              >
                {submitting ? '...' : 'Run'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workflows List ────────────────────────────────────────────────

function WorkflowsList() {
  const { data: workflows = [], isLoading } = useWorkflows();

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <span className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>Loading...</span>
    </div>
  );

  if (workflows.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <span className="text-2xl opacity-20">△</span>
      <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
        No workflows defined in this distribution
      </p>
    </div>
  );

  return (
    <div className="os-scroll p-4 h-full space-y-3">
      {workflows.map((wf: Workflow) => (
        <div key={wf.slug} className="os-panel-raised rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-os-text)' }}>
                {wf.name}
              </p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-os-text-muted)' }}>
                {wf.slug}
              </p>
            </div>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                color: wf.status === 'active' ? 'var(--color-active)' : 'var(--color-os-text-muted)',
                background: wf.status === 'active' ? 'rgba(16,185,129,0.08)' : 'transparent',
              }}
            >
              {wf.status}
            </span>
          </div>
          {wf.triggers && wf.triggers.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {wf.triggers.map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-os-panel)', color: 'var(--color-os-text-secondary)', border: '1px solid var(--color-os-border-subtle)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {wf.steps && wf.steps.length > 0 && (
            <div className="space-y-1 mt-2">
              {wf.steps.map((step) => (
                <div key={step.order} className="flex gap-2 items-start">
                  <span className="text-[10px] font-mono shrink-0 w-4 text-right"
                    style={{ color: 'var(--color-kernel)', opacity: 0.5 }}>
                    {step.order}
                  </span>
                  <span className="text-[10px] leading-relaxed"
                    style={{ color: 'var(--color-os-text-secondary)' }}>
                    {step.instruction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Agents Panel (reused from AgentsApp) ──────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--color-active)',
  idle: 'var(--color-warning)',
  offline: 'var(--color-os-text-muted)',
};

const ACCESS_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'inner-harness': { label: 'inner harness', color: 'var(--color-kernel)', bg: 'var(--color-kernel-soft)' },
  'specialized': { label: 'specialized', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'external': { label: 'external', color: 'var(--color-os-text-muted)', bg: 'var(--color-os-panel)' },
};

function AccessBlock({ access }: { access: AgentAccess }) {
  const lvl = ACCESS_LEVEL_CONFIG[access.level] ?? ACCESS_LEVEL_CONFIG['external'];
  const readDomains = access.read.domains === '*' ? 'all domains' : (access.read.domains as string[]).join(', ') || 'none';
  const writeDomains = access.write.domains === '*' ? 'all domains' : (access.write.domains as string[]).join(', ') || 'none';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: lvl.bg, color: lvl.color }}>
          {lvl.label}
        </span>
        {access.sudo.enabled && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            sudo
          </span>
        )}
      </div>
      <div className="flex gap-1.5 items-start">
        <span className="text-[9px] w-8 shrink-0 font-mono" style={{ color: 'var(--color-active)' }}>read</span>
        <span className="text-[10px]" style={{ color: 'var(--color-os-text-secondary)' }}>{readDomains}</span>
      </div>
      <div className="flex gap-1.5 items-start">
        <span className="text-[9px] w-8 shrink-0 font-mono" style={{ color: '#f59e0b' }}>write</span>
        <span className="text-[10px]" style={{ color: 'var(--color-os-text-secondary)' }}>{writeDomains}</span>
      </div>
    </div>
  );
}

function AgentsPanel() {
  const { data: agents = [], isLoading } = useAgents();

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <span className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>Loading agents...</span>
    </div>
  );

  if (agents.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <span className="text-2xl opacity-20">⬡</span>
      <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
        No agents registered in this distribution
      </p>
    </div>
  );

  return (
    <div className="os-scroll p-4 h-full space-y-3">
      {(agents as MeshAgent[]).map((agent) => (
        <div key={agent.slug} className="os-panel-raised rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-os-text)' }}>{agent.name}</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-os-text-muted)' }}>{agent.slug}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[agent.status] ?? STATUS_COLORS.offline }} />
              <span className="text-[10px]" style={{ color: STATUS_COLORS[agent.status] ?? STATUS_COLORS.offline }}>{agent.status}</span>
            </div>
          </div>
          {agent.surface && (
            <span className="text-[10px] px-1.5 py-0.5 rounded inline-block"
              style={{ background: 'var(--color-os-panel)', color: 'var(--color-os-text-muted)', border: '1px solid var(--color-os-border)' }}>
              {agent.surface}
            </span>
          )}
          {agent.access && <AccessBlock access={agent.access} />}
          {agent.capabilities?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {agent.capabilities.map((cap: string) => (
                <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-os-panel)', color: 'var(--color-os-text-secondary)', border: '1px solid var(--color-os-border-subtle)' }}>
                  {cap}
                </span>
              ))}
            </div>
          )}
          {agent.notes && (
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--color-os-text-muted)' }}>{agent.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Workflows App ──────────────────────────────────────────���─

export function WorkflowsApp() {
  const { data: jobs = [] } = useWorkflowJobs();
  const [tab, setTab] = useState<Tab>('active');
  const runningCount = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-1 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-os-border-subtle)' }}
      >
        <TabBtn id="active" active={tab === 'active'} onClick={() => setTab('active')} label="Active" badge={runningCount} />
        <TabBtn id="workflows" active={tab === 'workflows'} onClick={() => setTab('workflows')} label="Workflows" />
        <TabBtn id="agents" active={tab === 'agents'} onClick={() => setTab('agents')} label="Agents" />
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'active' && <ActiveExecution />}
        {tab === 'workflows' && <WorkflowsList />}
        {tab === 'agents' && <AgentsPanel />}
      </div>
    </div>
  );
}
