import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import type { AppId, SystemAppId } from '../store';
import { KnowledgeApp } from '../apps/knowledge/KnowledgeApp';
import { SessionsApp }  from '../apps/sessions/SessionsApp';
import { CortexApp }    from '../apps/cortex/CortexApp';
import { TerminalApp }  from '../apps/terminal/TerminalApp';
import { AgentsApp }    from '../apps/agents/AgentsApp';
import { SettingsApp }  from '../apps/settings/SettingsApp';
import { TheoryApp }    from '../apps/theory/TheoryApp';
import { WorkflowsApp } from '../apps/workflows/WorkflowsApp';
import { Way2FlyApp }   from '../apps/way2fly/Way2FlyApp';
import { osAppDock }    from '../lib/design-system';

const APP_COMPONENTS: Record<SystemAppId, React.ComponentType> = {
  knowledge: KnowledgeApp,
  sessions:  SessionsApp,
  cortex:    CortexApp,
  terminal:  TerminalApp,
  agents:    AgentsApp,
  settings:  SettingsApp,
  theory:    TheoryApp,
  workflows: WorkflowsApp,
};

const APP_TITLES: Record<string, string> = {
  knowledge: 'Knowledge Manager',
  sessions:  'Session Monitor',
  cortex:    'Cognitive Layer',
  terminal:  'Terminal',
  agents:    'Agents',
  settings:  'Settings',
  theory:    'Theory',
  workflows: 'Workflows',
};

const APP_ICONS: Record<string, string> = {
  knowledge: '◈',
  sessions:  '⊛',
  cortex:    '◉',
  terminal:  '⌥',
  agents:    '⬡',
  settings:  '⚙',
  theory:    '⊕',
  workflows: '⚡',
};

const APP_DESCS: Record<string, string> = {
  knowledge: 'Browse and search knowledge domains',
  sessions:  'Monitor sessions and handoffs',
  cortex:    'Learnings, decisions, concern coverage',
  terminal:  'CLI — direct command access',
  agents:    'Mesh agents and access profiles',
  settings:  'Distribution configuration',
  theory:    'OS layers, types, and concerns map',
  workflows: 'Dev process, build features for packages',
};

const PKG_ICONS: Record<string, string> = {
  parachute: '🪂',
  chart: '📊',
  book: '📖',
  hammer: '🔨',
  message: '💬',
  cog: '⚙',
  cpu: '🤖',
};

const PKG_COMPONENTS: Record<string, React.ComponentType> = {
  way2fly: Way2FlyApp,
};

function AppWindow({ appId }: { appId: AppId }) {
  const activeApp    = useStore((s) => s.activeApp);
  const setActiveApp = useStore((s) => s.setActiveApp);
  const closeApp     = useStore((s) => s.closeApp);
  const packageApps  = useStore((s) => s.packageApps);
  const isActive     = activeApp === appId;

  const isPkg = appId.startsWith('pkg:');
  const pkgSlug = isPkg ? appId.slice(4) : null;
  const pkgApp = pkgSlug ? packageApps.find(a => a.slug === pkgSlug) : null;

  const Component = isPkg ? (pkgSlug ? PKG_COMPONENTS[pkgSlug] : null) : APP_COMPONENTS[appId as SystemAppId];
  const title = isPkg ? (pkgApp?.name ?? pkgSlug) : APP_TITLES[appId];
  const icon = isPkg ? (PKG_ICONS[pkgApp?.icon ?? ''] ?? '○') : APP_ICONS[appId];

  return (
    <div
      onClick={() => !isActive && setActiveApp(appId)}
      className="absolute inset-5 flex flex-col overflow-hidden window-in"
      style={{
        borderRadius: 12,
        background: 'var(--color-os-panel)',
        border: `1px solid ${isActive ? 'var(--color-kernel-glow)' : 'var(--color-os-border)'}`,
        borderTop: `2px solid ${isActive ? 'var(--color-kernel)' : 'var(--color-os-border)'}`,
        boxShadow: isActive
          ? '0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 32px 80px rgba(0,0,0,0.75), 0 0 40px rgba(99,102,241,0.06)'
          : '0 16px 48px rgba(0,0,0,0.5)',
        opacity: isActive ? 1 : 0.55,
        zIndex: isActive ? 10 : 1,
        transform: isActive ? 'none' : 'scale(0.985)',
        pointerEvents: isActive ? 'auto' : 'none',
        transition: 'opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 40,
          borderBottom: '1px solid var(--color-os-border-subtle)',
          background: 'rgba(255,255,255,0.015)',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div className="traffic-lights shrink-0" style={{ position: 'relative', zIndex: 50 }}>
          <button
            type="button"
            className="traffic-light traffic-light-close"
            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 51 }}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); closeApp(appId); }}
            title="Close"
          />
          <div className="traffic-light traffic-light-inert" title="Minimize (use dock)" />
          <div className="traffic-light traffic-light-inert" title="Full screen" />
        </div>

        <div className="flex-1 flex items-center justify-center gap-1.5 -ml-[60px]">
          <span className="text-xs leading-none" style={{ color: 'var(--color-os-text-muted)' }}>
            {icon}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: isActive ? 'var(--color-os-text-secondary)' : 'var(--color-os-text-muted)' }}
          >
            {title}
          </span>
        </div>

        <div style={{ width: 60 }} />
      </div>

      <div className="flex-1 overflow-hidden">
        {Component ? <Component /> : (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <span className="text-4xl">{icon}</span>
            <p className="text-sm font-medium" style={{ color: 'var(--color-os-text-secondary)' }}>
              {pkgApp?.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-os-text-muted)' }}>
              Package app — connect via Build or install from source
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Assistant Input Bar ─────────────────────────────────────────

function AssistantInput({ compact }: { compact?: boolean }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sendMessage = useStore((s) => s.sendAssistantMessage);
  const addResponse = useStore((s) => s.addAssistantResponse);
  const messages = useStore((s) => s.assistantMessages);
  const expanded = useStore((s) => s.assistantExpanded);
  const activeApp = useStore((s) => s.activeApp);
  const packageApps = useStore((s) => s.packageApps);

  // Determine context: active package app slug (or null for OS context)
  const activePackage = activeApp?.startsWith('pkg:') ? activeApp.slice(4) : null;
  const activePkgApp = activePackage ? packageApps.find(p => p.slug === activePackage) : null;
  const placeholder = activePkgApp?.assistant?.placeholder || (compact ? 'Message…' : 'Ask anything…');

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
    setLoading(true);

    try {
      const chatMessages = [...messages, { role: 'user', content: text }].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages, activeApp: activePackage }),
      });

      if (!res.ok) {
        addResponse('Failed to reach the assistant. Check server logs.');
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        addResponse('No response stream available.');
        setLoading(false);
        return;
      }

      let full = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta' && data.text) {
              full += data.text;
            }
          } catch { /* skip */ }
        }
      }

      addResponse(full || 'No response received.');
    } catch {
      addResponse('Connection error. Is the server running?');
    }

    setLoading(false);
  };

  if (compact) {
    return (
      <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-os-border-subtle)',
        }}
      >
        <span className="text-[10px] shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.4 }}>◈</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={loading ? 'Thinking...' : placeholder}
          disabled={loading}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--color-os-text)', opacity: loading ? 0.5 : 1 }}
        />
        {loading ? (
          <div className="w-3 h-3 border-[1.5px] rounded-full animate-spin shrink-0"
            style={{ borderColor: 'var(--color-kernel-soft)', borderTopColor: 'var(--color-kernel)' }} />
        ) : input.trim() ? (
          <button
            onClick={handleSend}
            className="text-[10px] shrink-0 px-1.5 py-0.5 rounded"
            style={{ color: 'var(--color-kernel)', background: 'var(--color-kernel-soft)' }}
          >
            ↑
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`w-full max-w-lg mx-auto ${expanded ? 'px-6 pb-4 pt-2' : 'px-4'}`}>
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--color-os-border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span className="text-xs shrink-0" style={{ color: 'var(--color-kernel)', opacity: 0.5 }}>◈</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={loading ? 'Thinking...' : placeholder}
          disabled={loading}
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-os-text)', opacity: loading ? 0.5 : 1 }}
        />
        {loading ? (
          <div className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
            style={{ borderColor: 'var(--color-kernel-soft)', borderTopColor: 'var(--color-kernel)' }} />
        ) : input.trim() ? (
          <button
            onClick={handleSend}
            className="text-xs shrink-0 px-2 py-1 rounded-md"
            style={{ color: 'var(--color-kernel)', background: 'var(--color-kernel-soft)' }}
          >
            ↑
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Empty State / Launcher ──────────────────────────────────────

function EmptyState() {
  const openApp = useStore((s) => s.openApp);
  const distName = useStore((s) => s.distributionName);
  const expanded = useStore((s) => s.assistantExpanded);
  const expandAssistant = useStore((s) => s.expandAssistant);
  const minimizeAssistant = useStore((s) => s.minimizeAssistant);
  const messages = useStore((s) => s.assistantMessages);
  const packageApps = useStore((s) => s.packageApps);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, expanded]);

  const allApps = [
    ...packageApps.map(pkg => ({
      id: `pkg:${pkg.slug}` as AppId,
      label: pkg.name,
      icon: PKG_ICONS[pkg.icon] ?? '○',
      desc: pkg.description,
      color: pkg.color,
    })),
    ...osAppDock.map(app => ({
      id: app.id as AppId,
      label: app.label,
      icon: APP_ICONS[app.id] ?? '○',
      desc: APP_DESCS[app.id] ?? '',
      color: undefined,
    })),
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
      {/* Distribution wordmark */}
      <div className="flex flex-col items-center gap-2 select-none">
        <div
          className="text-3xl leading-none"
          style={{ color: 'var(--color-kernel)', opacity: expanded ? 0.1 : 0.25 }}
        >
          ◈
        </div>
        <p
          className="font-mono text-sm font-semibold tracking-wide"
          style={{ color: 'var(--color-os-text-muted)', opacity: expanded ? 0.3 : 1 }}
        >
          {distName || 'harness.os'}
        </p>
      </div>

      {/* App launcher grid — fades when chat is open */}
      {!expanded && (
        <div className="grid grid-cols-4 gap-2 px-8">
          {allApps.map((app) => (
            <button
              key={app.id}
              className="os-launcher-card"
              onClick={() => openApp(app.id)}
            >
              <span
                className="text-2xl leading-none"
                style={{ color: app.color ?? 'var(--color-os-text-muted)' }}
              >
                {app.icon}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--color-os-text-secondary)' }}
              >
                {app.label}
              </span>
              <span
                className="text-[10px] text-center leading-snug max-w-[90px]"
                style={{ color: 'var(--color-os-text-muted)' }}
              >
                {app.desc}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Assistant chat panel — compact centered card */}
      {expanded && (
        <div
          className="w-full max-w-xl rounded-xl overflow-hidden flex flex-col"
          style={{
            maxHeight: '50vh',
            background: 'var(--color-os-panel)',
            border: '1px solid var(--color-os-border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2 shrink-0"
            style={{ borderBottom: '1px solid var(--color-os-border-subtle)' }}>
            <span className="text-[10px] font-mono" style={{ color: 'var(--color-os-text-muted)' }}>
              assistant
            </span>
            <button
              onClick={minimizeAssistant}
              className="text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{ color: 'var(--color-os-text-muted)', background: 'rgba(255,255,255,0.04)' }}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" ref={chatScrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed"
                  style={msg.role === 'user' ? {
                    background: 'var(--color-kernel)',
                    color: '#fff',
                    borderBottomRightRadius: 4,
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--color-os-text-secondary)',
                    border: '1px solid var(--color-os-border-subtle)',
                    borderBottomLeftRadius: 4,
                  }}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assistant input — always visible */}
      <div className="w-full">
        {!expanded && messages.length > 0 && (
          <button
            onClick={expandAssistant}
            className="text-[10px] text-center block mx-auto mb-2 transition-colors"
            style={{ color: 'var(--color-os-text-muted)' }}
          >
            ↑ {messages.length} messages — tap to expand
          </button>
        )}
        <AssistantInput />
      </div>
    </div>
  );
}

// ── Desktop ─────────────────────────────────────────────────────

function TopAssistantBar() {
  const expandAssistant = useStore((s) => s.expandAssistant);
  const minimizeAssistant = useStore((s) => s.minimizeAssistant);
  const expanded = useStore((s) => s.assistantExpanded);
  const messages = useStore((s) => s.assistantMessages);
  const activeApp = useStore((s) => s.activeApp);
  const packageApps = useStore((s) => s.packageApps);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const activePackage = activeApp?.startsWith('pkg:') ? activeApp.slice(4) : null;
  const activePkgApp = activePackage ? packageApps.find(p => p.slug === activePackage) : null;

  useEffect(() => {
    if (expanded && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, expanded]);

  return (
    <div
      className="relative shrink-0 transition-all duration-300"
      style={{
        zIndex: 30,
        borderBottom: '1px solid var(--color-os-border-subtle)',
        background: activePkgApp
          ? `linear-gradient(135deg, rgba(0,0,0,0.4), ${activePkgApp.color}10)`
          : 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-1.5">
        {/* Context badge — shows which app the assistant is connected to */}
        {activePkgApp && (
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium transition-all duration-500 animate-pulse"
            style={{
              background: `${activePkgApp.color}20`,
              color: activePkgApp.color,
              border: `1px solid ${activePkgApp.color}30`,
              animationIterationCount: 3,
            }}
          >
            <span>{PKG_ICONS[activePkgApp.icon] || '○'}</span>
            <span>{activePkgApp.name}</span>
          </div>
        )}
        <AssistantInput compact />
        {!expanded && messages.length > 0 && (
          <button
            onClick={expandAssistant}
            className="text-[10px] shrink-0 px-2 py-1 rounded-md transition-colors"
            style={{ color: 'var(--color-os-text-muted)', background: 'rgba(255,255,255,0.04)' }}
          >
            ↑ {messages.length}
          </button>
        )}
        {expanded && (
          <button
            onClick={minimizeAssistant}
            className="text-[10px] shrink-0 px-2 py-1 rounded-md transition-colors"
            style={{ color: 'var(--color-os-text-muted)', background: 'rgba(255,255,255,0.04)' }}
          >
            ✕
          </button>
        )}
      </div>
      {expanded && messages.length > 0 && (
        <div
          className="overflow-y-auto px-4 py-2 space-y-2"
          ref={chatScrollRef}
          style={{
            maxHeight: '40vh',
            borderTop: '1px solid var(--color-os-border-subtle)',
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[70%] px-3 py-1.5 rounded-lg text-xs leading-relaxed"
                style={msg.role === 'user' ? {
                  background: 'var(--color-kernel)',
                  color: '#fff',
                  borderBottomRightRadius: 4,
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-os-text-secondary)',
                  border: '1px solid var(--color-os-border-subtle)',
                  borderBottomLeftRadius: 4,
                }}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Desktop() {
  const openApps = useStore((s) => s.openApps);
  const hasApps = openApps.length > 0;

  return (
    <div
      className="relative flex-1 overflow-hidden os-desktop-bg flex flex-col"
      style={{ background: 'var(--color-os-desktop)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 55% 35% at 50% 0%, var(--color-kernel-glow) 0%, transparent 70%)',
          opacity: 0.3,
        }}
      />

      {hasApps && <TopAssistantBar />}

      <div className="relative flex-1 overflow-hidden">
        {!hasApps && <EmptyState />}
        {openApps.map((appId) => (
          <AppWindow key={appId} appId={appId} />
        ))}
      </div>
    </div>
  );
}
