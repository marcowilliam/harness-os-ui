import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';
import type { WebSocketMessage } from '../lib/types';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const setWsConnected = useStore((s) => s.setWsConnected);
  const addNotification = useStore((s) => s.addNotification);
  const wsRef = useRef<WebSocket | undefined>(undefined);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (e) => {
        try {
          const msg: WebSocketMessage = JSON.parse(e.data);
          if ((msg.type === 'invalidate' || msg.type === 'workflow_progress') && msg.queryKeys) {
            for (const key of msg.queryKeys) {
              queryClient.invalidateQueries({ queryKey: key });
            }
          }
          if (msg.type === 'event' && msg.event) {
            addNotification(msg.event);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [queryClient, setWsConnected, addNotification]);
}
