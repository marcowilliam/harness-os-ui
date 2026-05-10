import { create } from 'zustand';
import type { OsEvent, AssistantMessage, PackageApp, DistroUser } from './lib/types';

export type SystemAppId = 'knowledge' | 'sessions' | 'cortex' | 'terminal' | 'agents' | 'settings' | 'theory' | 'workflows';
export type AppId = SystemAppId | `pkg:${string}`;

interface OsState {
  activeApp: AppId | null;
  setActiveApp: (app: AppId | null) => void;

  openApps: AppId[];
  openApp: (app: AppId) => void;
  closeApp: (app: AppId) => void;

  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;

  notifications: OsEvent[];
  addNotification: (e: OsEvent) => void;
  clearNotification: (i: number) => void;

  activeProject: string | null;
  setActiveProject: (p: string | null) => void;

  sessionTokens: number;
  setSessionTokens: (n: number) => void;
  sessionLearnings: number;
  setSessionLearnings: (n: number) => void;

  distributionName: string;
  setDistributionName: (name: string) => void;

  isBooting: boolean;
  setIsBooting: (v: boolean) => void;

  // Assistant
  assistantMessages: AssistantMessage[];
  assistantExpanded: boolean;
  sendAssistantMessage: (text: string) => void;
  addAssistantResponse: (content: string) => void;
  minimizeAssistant: () => void;
  expandAssistant: () => void;

  // Workflow execution
  activeWorkflowJob: string | null;
  setActiveWorkflowJob: (id: string | null) => void;

  // Package apps (from harness.yaml)
  packageApps: PackageApp[];
  setPackageApps: (apps: PackageApp[]) => void;

  // MCP app data — results from MCP tool calls, keyed by app slug
  appData: Record<string, Record<string, unknown>>;
  setAppData: (app: string, key: string, data: unknown) => void;
  clearAppData: (app: string) => void;

  // User identity
  activeUser: DistroUser | null;
  users: DistroUser[];
  setActiveUser: (user: DistroUser | null) => void;
  setUsers: (users: DistroUser[]) => void;
}

let msgId = 0;

export const useStore = create<OsState>((set) => ({
  activeApp: null,
  setActiveApp: (app) => set({ activeApp: app }),

  openApps: [],
  openApp: (app) => set((s) => ({
    openApps: s.openApps.includes(app) ? s.openApps : [...s.openApps, app],
    activeApp: app,
  })),
  closeApp: (app) => set((s) => ({
    openApps: s.openApps.filter(a => a !== app),
    activeApp: s.activeApp === app ? (s.openApps.filter(a => a !== app).at(-1) ?? null) : s.activeApp,
  })),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  notifications: [],
  addNotification: (e) => set((s) => ({ notifications: [e, ...s.notifications].slice(0, 20) })),
  clearNotification: (i) => set((s) => ({ notifications: s.notifications.filter((_, idx) => idx !== i) })),

  activeProject: null,
  setActiveProject: (p) => set({ activeProject: p }),

  sessionTokens: 0,
  setSessionTokens: (n) => set({ sessionTokens: n }),
  sessionLearnings: 0,
  setSessionLearnings: (n) => set({ sessionLearnings: n }),

  distributionName: '',
  setDistributionName: (name) => set({ distributionName: name }),

  isBooting: false,
  setIsBooting: (v) => set({ isBooting: v }),

  // Assistant
  assistantMessages: [],
  assistantExpanded: false,
  sendAssistantMessage: (text) => set((s) => ({
    assistantMessages: [...s.assistantMessages, {
      id: `msg-${++msgId}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }],
    assistantExpanded: true,
  })),
  addAssistantResponse: (content) => set((s) => ({
    assistantMessages: [...s.assistantMessages, {
      id: `msg-${++msgId}`,
      role: 'assistant',
      content,
      timestamp: Date.now(),
    }],
  })),
  minimizeAssistant: () => set({ assistantExpanded: false }),
  expandAssistant: () => set({ assistantExpanded: true }),

  // Workflow execution
  activeWorkflowJob: null,
  setActiveWorkflowJob: (id) => set({ activeWorkflowJob: id }),

  // Package apps
  packageApps: [],
  setPackageApps: (apps) => set({ packageApps: apps }),

  // MCP app data
  appData: {},
  setAppData: (app, key, data) => set((s) => ({
    appData: { ...s.appData, [app]: { ...s.appData[app], [key]: data } },
  })),
  clearAppData: (app) => set((s) => {
    const { [app]: _, ...rest } = s.appData;
    return { appData: rest };
  }),

  // User identity
  activeUser: null,
  users: [],
  setActiveUser: (user) => set({ activeUser: user }),
  setUsers: (users) => set({ users }),
}));
