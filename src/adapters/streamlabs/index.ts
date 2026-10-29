import type { NormalizedEvent, EventType } from '../../types/events';

export class StreamlabsAdapter {
  /**
   * Parses incoming Streamlabs webhook events (donation, follow, subscription, host, bits).
   */
  parseWebhook(payload: Record<string, any>): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];
    const timestamp = Date.now();
    const type = payload.type;
    const messageList = Array.isArray(payload.message) ? payload.message : [payload.message];

    for (const msg of messageList) {
      if (!msg) continue;
      const id = msg._id || msg.id || crypto.randomUUID();

      let eventType: EventType = 'donation';
      let amount: number | undefined;
      let currency: string | undefined;

      if (type === 'donation') {
        eventType = 'donation';
        amount = Number(msg.amount);
        currency = msg.currency || 'USD';
      } else if (type === 'follow') {
        eventType = 'follow';
      } else if (type === 'subscription') {
        eventType = 'subscription';
      } else if (type === 'bits' || type === 'cheer') {
        eventType = 'cheer';
        amount = Number(msg.amount);
        currency = 'BITS';
      } else if (type === 'raid' || type === 'host') {
        eventType = 'raid';
      }

      events.push({
        id,
        platform: 'streamlabs',
        type: eventType,
        actor: {
          id: msg.from_user_id || msg.name,
          username: (msg.name || 'donor').toLowerCase(),
          displayName: msg.name || 'Donador',
        },
        payload: {
          message: msg.message || msg.comment,
          amount,
          currency,
          months: msg.months ? Number(msg.months) : undefined,
          rawPayload: msg,
        },
        timestamp,
      });
    }

    return events;
  }
}

export const streamlabsAdapter = new StreamlabsAdapter();
