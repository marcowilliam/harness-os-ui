export type ConcernSlug = 'relational' | 'governance' | 'causal' | 'metacognitive' | 'security';
export type HarnessType = 'build' | 'product' | 'operations' | 'domain';

export const concerns: ConcernSlug[] = ['relational', 'governance', 'causal', 'metacognitive', 'security'];

export const concernLabels: Record<ConcernSlug, string> = {
  relational: 'Relational',
  governance: 'Governance',
  causal: 'Causal',
  metacognitive: 'Metacognitive',
  security: 'Security',
};

export const concernColors: Record<ConcernSlug, string> = {
  relational: '#6366f1',
  governance: '#dc2626',
  causal: '#f59e0b',
  metacognitive: '#a855f7',
  security: '#0891b2',
};

export const harnessTypes: Record<HarnessType, { label: string; color: string }> = {
  build: { label: 'Build', color: '#06b6d4' },
  product: { label: 'Product', color: '#a855f7' },
  operations: { label: 'Operations', color: '#10b981' },
  domain: { label: 'Domain', color: '#f59e0b' },
};

const buildDomains = ['architecture', 'conventions', 'dev-workflow', 'tooling', 'testing', 'engineering', 'infrastructure'];
const productDomains = ['features', 'domain-model', 'business-logic', 'roadmap', 'product'];
const opsDomains = ['operations', 'legal', 'finance', 'devops', 'personal'];

export function getHarnessType(domain: string): HarnessType {
  const d = domain.toLowerCase();
  if (buildDomains.some(b => d.includes(b))) return 'build';
  if (productDomains.some(p => d.includes(p))) return 'product';
  if (opsDomains.some(o => d.includes(o))) return 'operations';
  return 'domain';
}

export const osAppDock = [
  { id: 'knowledge', label: 'Knowledge', icon: 'knowledge' },
  { id: 'sessions',  label: 'Sessions',  icon: 'sessions'  },
  { id: 'cortex',    label: 'Cognitive',   icon: 'cortex'    },
  { id: 'workflows', label: 'Workflows', icon: 'workflows' },
  { id: 'terminal',  label: 'Terminal',  icon: 'terminal'  },
  { id: 'agents',    label: 'Agents',    icon: 'agents'    },
  { id: 'settings',  label: 'Settings',  icon: 'settings'  },
  { id: 'theory',    label: 'Theory',    icon: 'theory'    },
];
