import { WebSocketServer, WebSocket } from "ws";

const WS_PORT = parseInt(process.env.WS_PORT ?? "9822", 10);

/**
 * Starts a WebSocket bridge and returns a broadcast function.
 *
 * Tries to start a WS server on the configured WS_PORT. If the port is already taken
 * (another MCP instance owns it), falls back to forwarding broadcasts
 * as a client through the existing server.
 */
export function startWsBridge(): (elements: any[]) => void {
  let mode: "server" | "client" = "server";
  const clients = new Set<WebSocket>();
  let forwardWs: WebSocket | null = null;

  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.error(`[ws-bridge] client connected (${clients.size} total)`);

    // Relay messages from forwarding MCP instances to all other clients
    ws.on("message", (data) => {
      const msg = typeof data === "string" ? data : data.toString();
      console.error(`[ws-bridge] relaying forwarded message to ${clients.size - 1} client(s)`);
      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.error(`[ws-bridge] client disconnected (${clients.size} total)`);
    });
  });

  wss.on("listening", () => {
    mode = "server";
    console.error(`[ws-bridge] listening on ws://localhost:${WS_PORT}`);
  });

  wss.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[ws-bridge] port ${WS_PORT} in use, switching to client-forward mode`);
      mode = "client";
      wss.close();
      connectForward();
    } else {
      console.error("[ws-bridge] server error:", err.message);
    }
  });

  function connectForward() {
    forwardWs = new WebSocket(`ws://localhost:${WS_PORT}`);
    forwardWs.on("open", () => {
      console.error("[ws-bridge] connected to existing bridge (forward mode)");
    });
    forwardWs.on("close", () => {
      console.error("[ws-bridge] forward connection lost, reconnecting...");
      forwardWs = null;
      setTimeout(connectForward, 2000);
    });
    forwardWs.on("error", () => {
      // close handler will reconnect
    });
  }

  return (elements: any[]) => {
    const data = JSON.stringify(elements);

    if (mode === "server") {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
      console.error(`[ws-bridge] broadcast ${elements.length} elements to ${clients.size} client(s)`);
    } else if (forwardWs?.readyState === WebSocket.OPEN) {
      forwardWs.send(data);
      console.error(`[ws-bridge] forwarded ${elements.length} elements to existing bridge`);
    } else {
      console.error(`[ws-bridge] cannot broadcast: forward connection not ready`);
    }
  };
}
