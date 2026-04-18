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
    // 1. Initialize WebSocket Connection
    // Note: In development, vite proxy might not handle WS automatically, 
    // but in industrial deploy we assume standard WS port.
    const socket = new WebSocket(`ws://${window.location.hostname}:3000`);
    socketRef.current = socket;

    socket.onopen = () => {
      updateStreamingMetrics({ isStreaming: true, currentCycle: 0, mismatchCount: 0 });
      toast.success("Industrial Live Stream Connected");

      // 2. Trigger Diagnostic Core
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
          mismatchCount: useStore.getState().streamingMetrics.mismatchCount + mismatchesInBatch
        });
      }

      if (type === "DIAGNOSTIC_COMPLETE") {
        updateStreamingMetrics({ isStreaming: false });
        toast.success("Diagnostic Analysis Complete");
        socket.close();
      }

      if (type === "ERROR") {
        toast.error(`Streaming Error: ${message}`);
        updateStreamingMetrics({ isStreaming: false });
        socket.close();
      }
    };

    socket.onclose = () => {
      updateStreamingMetrics({ isStreaming: false });
    };

    socket.onerror = (err) => {
      console.error("WebSocket Error:", err);
      updateStreamingMetrics({ isStreaming: false });
    };
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
