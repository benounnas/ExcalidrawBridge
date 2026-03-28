import { useCallback, useEffect, useRef } from "react";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const WS_PORT = import.meta.env.VITE_WS_PORT ?? "9822";
const WS_URL = `ws://localhost:${WS_PORT}`;
const RECONNECT_INTERVAL = 3000;

// Control messages from the MCP server that aren't real Excalidraw shapes
const PSEUDO_TYPES = new Set(["cameraUpdate", "delete", "restoreCheckpoint"]);

/**
 * Connects to the MCP server over WebSocket and pushes incoming
 * drawing elements onto the Excalidraw canvas.
 *
 * Flow: MCP Client (Claude) → MCP Server (:9822) → WebSocket → this hook → Excalidraw
 */
export function useExcalidrawBridge() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Callback passed to <Excalidraw excalidrawAPI={...} /> to capture the imperative handle
  const onApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    function connect() {
      if (!alive) return;
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("[ws-bridge] connected");
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      ws.onmessage = async (event) => {
        const api = apiRef.current;
        if (!api) return;

        try {
          // MCP server sends a JSON array of element definitions, e.g.:
          // [{ "type": "rectangle", "x": 10, "y": 20, "width": 100, "height": 50 }]
          const text = typeof event.data === "string" ? event.data : await event.data.text();
          const raw: any[] = JSON.parse(text);

          // Filter out control messages that would cause errors if treated as shapes
          const filtered = raw.filter((el: any) => !PSEUDO_TYPES.has(el.type));

          // convertToExcalidrawElements fills in required internal fields (ids, versions, styles)
          const elements = convertToExcalidrawElements(filtered);

          api.updateScene({ elements });
          api.scrollToContent(elements, { fitToContent: true });
        } catch (err) {
          console.error("[ws-bridge] failed to process message:", err);
        }
      };

      ws.onclose = () => {
        console.log("[ws-bridge] disconnected");
        if (alive && !reconnectTimer) {
          reconnectTimer = setTimeout(connect, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = (err) => {
        console.error("[ws-bridge] error:", err);
      };
    }

    connect();

    return () => {
      alive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  return { onApiReady };
}
