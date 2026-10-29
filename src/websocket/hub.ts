import type { ServerWebSocket } from 'bun';
import type { NormalizedEvent } from '../types/events';
import type { StreamSession, ViewerSnapshot } from '../types/sessions';

export type OutgoingWsMessage = 
  | { type: 'event'; data: NormalizedEvent }
  | { type: 'session_update'; data: StreamSession }
  | { type: 'viewer_snapshot'; data: ViewerSnapshot }
  | { type: 'pong'; timestamp: number };

export class WebSocketHub {
  private clients = new Set<ServerWebSocket<any>>();

  register(ws: ServerWebSocket<any>): void {
    this.clients.add(ws);
  }

  unregister(ws: ServerWebSocket<any>): void {
    this.clients.delete(ws);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  handleMessage(ws: ServerWebSocket<any>, message: string | Buffer): void {
    try {
      const text = typeof message === 'string' ? message : message.toString();
      const parsed = JSON.parse(text);

      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // Ignore malformed input
    }
  }

  broadcast(msg: OutgoingWsMessage): void {
    const serialized = JSON.stringify(msg);
    for (const ws of this.clients) {
      try {
        ws.send(serialized);
      } catch (err) {
        console.error('Error enviando mensaje a cliente WS:', err);
        this.clients.delete(ws);
      }
    }
  }
}

export const wsHub = new WebSocketHub();
