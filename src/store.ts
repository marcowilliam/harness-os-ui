import { create } from 'zustand';
import type { OsEvent } from './lib/types';

export type AppId = 'knowledge' | 'sessions' | 'cortex' | 'terminal' | 'agents' | 'settings' | 'theory';

interface OsState {
  // Active app
  activeApp: AppId | null;
  setActiveApp: (app: AppId | null) => void;

  // Open apps (can have multiple)
  openApps: AppId[];
  openApp: (app: AppId) => void;
  closeApp: (app: AppId) => void;

  // WebSocket
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;

  // Notifications
  notifications: OsEvent[];
  addNotification: (e: OsEvent) => void;
  clearNotification: (i: number) => void;

  // Session tracking
  activeProject: string | null;
  setActiveProject: (p: string | null) => void;

  // Tray counters
  sessionTokens: number;
  setSessionTokens: (n: number) => void;
  sessionLearnings: number;
  setSessionLearnings: (n: number) => void;

  // Distribution info (loaded from /api/health)
  distributionName: string;
  setDistributionName: (name: string) => void;

  // Boot sequence
  isBooting: boolean;
  setIsBooting: (v: boolean) => void;
}

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
}));
