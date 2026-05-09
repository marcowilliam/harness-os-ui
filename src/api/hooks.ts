import { useQuery } from '@tanstack/react-query';
import type {
  KnowledgeDomain,
  KnowledgeChunk,
  Rule,
  Workflow,
  Learning,
  Decision,
  MeshAgent,
  Session,
  HealthStatus,
} from '../lib/types';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export function useHealth() {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: () => get('/api/health'),
    refetchInterval: 30_000,
  });
}

export function useKnowledge() {
  return useQuery<KnowledgeDomain[]>({
    queryKey: ['knowledge'],
    queryFn: () => get('/api/knowledge'),
  });
}

export function useKnowledgeDomain(domain: string) {
  return useQuery<KnowledgeDomain>({
    queryKey: ['knowledge', domain],
    queryFn: () => get(`/api/knowledge/${domain}`),
    enabled: !!domain,
  });
}

export function useKnowledgeChunk(domain: string, slug: string) {
  return useQuery<KnowledgeChunk>({
    queryKey: ['knowledge', domain, slug],
    queryFn: () => get(`/api/knowledge/${domain}/${slug}`),
    enabled: !!domain && !!slug,
  });
}

export function useRules() {
  return useQuery<Rule[]>({
    queryKey: ['rules'],
    queryFn: () => get('/api/rules'),
  });
}

export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: () => get('/api/workflows'),
  });
}

export function useLearnings() {
  return useQuery<Learning[]>({
    queryKey: ['learnings'],
    queryFn: () => get('/api/learnings'),
  });
}

export function useDecisions() {
  return useQuery<Decision[]>({
    queryKey: ['decisions'],
    queryFn: () => get('/api/decisions'),
  });
}

export function useSessions(project: string) {
  return useQuery<Session[]>({
    queryKey: ['sessions', project],
    queryFn: () => get(`/api/sessions/${project}`),
    enabled: !!project,
  });
}

export function useAgents() {
  return useQuery<MeshAgent[]>({
    queryKey: ['agents'],
    queryFn: () => get('/api/mesh/agents'),
  });
}
