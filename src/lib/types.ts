export interface KnowledgeChunk {
  slug: string;
  title: string;
  domain: string;
  content: string;
  tags: string[];
  concerns: string[];
  status: string;
  created?: string;
  source?: string;
}

export interface KnowledgeDomain {
  domain: string;
  chunkCount: number;
  chunks: KnowledgeChunk[];
}

export interface Rule {
  slug: string;
  name: string;
  content: string;
  triggers: string[];
  priority: number;
  status: string;
  concerns: string[];
  appliesTo?: string[];
}

export interface Workflow {
  slug: string;
  name: string;
  type?: 'build' | 'product' | 'shared';
  status: string;
  triggers: string[];
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  order: number;
  name?: string;
  instruction: string;
}

export interface Learning {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  concerns: string[];
  created?: string;
}

export interface Decision {
  slug: string;
  title: string;
  rationale: string;
  context?: string;
  concern?: string;
  concerns?: string[];
  project?: string;
  created?: string;
}

export interface AgentAccess {
  level: 'inner-harness' | 'specialized' | 'external';
  read: {
    domains: string[] | '*';
    concerns: string[] | '*';
    cognitive_layer: boolean;
  };
  write: {
    domains: string[] | '*';
    cognitive_layer: boolean;
  };
  sudo: {
    enabled: boolean;
    requires_decision?: boolean;
    allowed_ops?: string[];
  };
}

export interface MeshAgent {
  slug: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'offline';
  surface?: string;
  capabilities: string[];
  tools?: string[];
  lastSeen?: string;
  notes?: string;
  access?: AgentAccess;
}

export interface Session {
  slug: string;
  project: string;
  date: string;
  summary: string;
  workCompleted: string[];
  nextSteps: string[];
  openQuestions?: string[];
  toolCalls?: number;
  decisionsLogged?: number;
  learningsLogged?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface DistributionBrand {
  primary: string;
  background: string;
  panel: string;
  accent: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  harnessPath: string;
  distribution?: string;
  projects: string[];
  brand?: DistributionBrand;
  capabilities?: {
    active: string[];
    available: Array<{ capability: string; signal: string }>;
  };
  counts: {
    knowledge: number;
    rules: number;
    workflows: number;
    learnings: number;
    decisions: number;
    agents: number;
  };
  apps?: Record<string, {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
    knowledgeDomain?: string;
    autoOpen?: boolean;
  }>;
  users?: Record<string, {
    name?: string;
    role?: string;
    initials?: string;
    color?: string;
  }>;
  instance?: {
    user?: string;
    shellPort?: number;
  };
}

export interface WebSocketMessage {
  type: 'invalidate' | 'ping' | 'event' | 'workflow_progress';
  queryKeys?: string[][];
  event?: OsEvent;
}

export interface OsEvent {
  type: 'learning-logged' | 'decision-logged' | 'session-started' | 'session-ended' | 'file-changed' | 'sync-complete';
  title?: string;
  project?: string;
  count?: number;
  timestamp: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface PackageApp {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  knowledgeDomain?: string;
  autoOpen?: boolean;
  mcp?: {
    server: string;
    status: 'disconnected' | 'connecting' | 'ready' | 'error';
    tools: string[];
  };
  assistant?: {
    systemPrompt: string;
    placeholder: string;
  };
}

export interface DistroUser {
  slug: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}
