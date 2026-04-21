import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import toast from 'react-hot-toast';

/**
 * Industrial Streaming Diagnostic Hook
 *
 * Manages the WebSocket lifecycle for real-time diagnostic telemetry.
 * Connects to the backend wss, triggers the stream, and synchronizes the global store.
 */
export function useStreamingDiagnostic() {
  const { updateStreamingMetrics, projectData, setProjectData } = useStore();
  const socketRef = useRef<WebSocket | null>(null);

  const startStreaming = useCallback((parsedSTIL: any, logMap?: Record<string, string>) => {
    // 1. Dynamic Industrial Endpoint Detection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port !== '5173' ? window.location.port : '3000'; // Default to 3000 if in dev
    const wsUrl = `${protocol}//${host}${port ? `:${port}` : ''}`;
    
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 5;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempts = 0;
        updateStreamingMetrics({ isStreaming: true, currentCycle: 0, mismatchCount: 0 });
        toast.success("Industrial Live Stream Connected");

        socket.send(JSON.stringify({
          type: "START_STREAMING_DIAGNOSTIC",
          payload: { parsedSTIL, logMap }
        }));
      };

      socket.onmessage = (event) => {
        const { type, data, message } = JSON.parse(event.data);

        if (type === "TELEMETRY_BATCH") {
          const batch = data as any[];
          const lastResult = batch[batch.length - 1];
          const mismatchesInBatch = batch.filter(r => r.mismatch).length;

          updateStreamingMetrics({
            currentCycle: lastResult.cycle,
            currentPattern: lastResult.patternId,
            currentPatternIndex: lastResult.patternIndex,
            totalPatterns: lastResult.totalPatterns,
            mismatchCount: useStore.getState().streamingMetrics.mismatchCount + mismatchesInBatch
          });
        }

        if (type === "INGESTION_PROGRESS") {
          const progress = data || {};
          useStore.getState().setIngestionProgress(progress.filename, { status: progress.step, details: progress.details });
        }

        if (type === "DIAGNOSTIC_COMPLETE") {
          updateStreamingMetrics({ isStreaming: false });
          toast.success("Diagnostic Analysis Complete");
          socket.close();
        }

        if (type === "ERROR") {
          toast.error(`Industrial Error: ${message}`);
          updateStreamingMetrics({ isStreaming: false });
          socket.close();
        }
      };

      socket.onclose = (event) => {
        if (!event.wasClean && reconnectAttempts < MAX_RECONNECT) {
          reconnectAttempts++;
          const delay = Math.pow(2, reconnectAttempts) * 1000;
          toast.loading(`Connection Lost. Retrying in ${delay/1000}s...`, { duration: delay });
          setTimeout(connect, delay);
        } else {
          updateStreamingMetrics({ isStreaming: false });
        }
      };

      socket.onerror = (err) => {
        console.error("Industrial WS Error:", err);
      };
    };

    connect();
  }, [updateStreamingMetrics]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return { startStreaming };
}
