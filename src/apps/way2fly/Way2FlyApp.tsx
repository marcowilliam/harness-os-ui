import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useMcpCall } from '../../api/useMcp';
import { DebriefList } from './DebriefList';
import { DebriefDetail } from './DebriefDetail';
import { StatsBar } from './StatsBar';

type View = 'loading' | 'list' | 'detail' | 'empty';

export function Way2FlyApp() {
  const appData = useStore((s) => s.appData['way2fly']);
  const [view, setView] = useState<View>('loading');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mcpCall = useMcpCall('way2fly');

  // On mount: fetch stats and initial debriefs
  useEffect(() => {
    mcpCall.mutate({ tool: 'get_stats' });
    mcpCall.mutate({ tool: 'get_debriefs', args: { limit: 20 } }, {
      onSuccess: () => setView('list'),
      onError: () => setView('empty'),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for assistant-driven navigation
  useEffect(() => {
    const data = appData?.get_debrief;
    if (data && typeof data === 'object' && 'debrief' in (data as Record<string, unknown>)) {
      const d = (data as { debrief: { id: string } }).debrief;
      setSelectedId(d.id);
      setView('detail');
    }
  }, [appData?.get_debrief]);

  useEffect(() => {
    if (appData?.get_debriefs && view === 'loading') {
      setView('list');
    }
  }, [appData?.get_debriefs, view]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView('detail');
    mcpCall.mutate({ tool: 'get_debrief', args: { id } });
  };

  const handleBack = () => {
    setSelectedId(null);
    setView('list');
  };

  const stats = appData?.get_stats as { stats: Record<string, unknown> } | undefined;
  const debriefs = appData?.get_debriefs as { debriefs: Array<Record<string, unknown>> } | undefined;
  const debriefDetail = appData?.get_debrief as { debrief: Record<string, unknown> } | undefined;

  return (
    <div className="h-full flex flex-col bg-[#0a0d12] text-white overflow-hidden">
      <StatsBar stats={stats?.stats} loading={mcpCall.isPending && !stats} />

      {view === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-zinc-500">Connecting to way2fly...</span>
          </div>
        </div>
      )}

      {view === 'empty' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-3xl">🪂</span>
            <p className="text-sm text-zinc-400 mt-2">No debriefs yet</p>
            <p className="text-xs text-zinc-600 mt-1">Ask the assistant to show your debriefs</p>
          </div>
        </div>
      )}

      {view === 'list' && (
        <DebriefList
          debriefs={debriefs?.debriefs || []}
          onSelect={handleSelect}
          loading={mcpCall.isPending}
        />
      )}

      {view === 'detail' && selectedId && (
        <DebriefDetail
          debrief={debriefDetail?.debrief}
          onBack={handleBack}
          loading={mcpCall.isPending && !debriefDetail}
        />
      )}
    </div>
  );
}
