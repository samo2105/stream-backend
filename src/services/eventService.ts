import { getDb } from '../../db';
import type { NormalizedEvent } from '../types/events';
import { wsHub } from '../websocket/hub';
import { sessionManager } from './sessionManager';

export class EventService {
  /**
   * Persists an incoming normalized stream event and broadcasts it to all WebSocket clients.
   */
  async processEvent(event: NormalizedEvent): Promise<NormalizedEvent> {
    const activeSession = sessionManager.getActiveSession();
    if (activeSession) {
      event.sessionId = activeSession.id;
      await sessionManager.incrementEventCount();
    }

    try {
      const sql = getDb();
      await sql`
        INSERT INTO stream_events (
          id,
          session_id,
          platform,
          event_type,
          actor_id,
          actor_name,
          message,
          amount,
          currency,
          metadata,
          created_at
        ) VALUES (
          ${event.id},
          ${event.sessionId ?? null},
          ${event.platform},
          ${event.type},
          ${event.actor.id ?? null},
          ${event.actor.displayName || event.actor.username},
          ${event.payload.message ?? null},
          ${event.payload.amount ?? null},
          ${event.payload.currency ?? null},
          ${JSON.stringify({
            username: event.actor.username,
            avatarUrl: event.actor.avatarUrl,
            badges: event.actor.badges,
            emotes: event.payload.emotes,
            giftName: event.payload.giftName,
            giftCount: event.payload.giftCount,
            tier: event.payload.tier,
            months: event.payload.months,
            raw: event.payload.rawPayload,
          })},
          ${new Date(event.timestamp).toISOString()}
        )
      `;
    } catch (e) {
      console.error('Error guardando stream_events en DB:', e);
    }

    // Broadcast in real-time to all connected widgets/dashboard
    wsHub.broadcast({ type: 'event', data: event });

    return event;
  }

  /**
   * Retrieves recent events for dashboard or widget initial population.
   */
  async getRecentEvents(limit: number = 50, platform?: string): Promise<NormalizedEvent[]> {
    try {
      const sql = getDb();
      const rows = platform
        ? await sql`
            SELECT * FROM stream_events
            WHERE platform = ${platform}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT * FROM stream_events
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;

      return rows.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        platform: r.platform,
        type: r.event_type,
        actor: {
          id: r.actor_id,
          username: r.metadata?.username || r.actor_name,
          displayName: r.actor_name,
          avatarUrl: r.metadata?.avatarUrl,
          badges: r.metadata?.badges,
        },
        payload: {
          message: r.message,
          amount: r.amount ? Number(r.amount) : undefined,
          currency: r.currency,
          giftName: r.metadata?.giftName,
          giftCount: r.metadata?.giftCount,
          emotes: r.metadata?.emotes,
          tier: r.metadata?.tier,
          months: r.metadata?.months,
        },
        timestamp: new Date(r.created_at).getTime(),
      }));
    } catch (e) {
      console.error('Error consultando stream_events:', e);
      return [];
    }
  }
}

export const eventService = new EventService();
