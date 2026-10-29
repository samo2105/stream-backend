import type { NormalizedEvent } from '../../types/events';

export class KickAdapter {
  /**
   * Parses chat and event messages from Kick Pusher channels.
   * Event format: App\Events\ChatMessageEvent, etc.
   */
  parsePusherEvent(eventName: string, data: Record<string, any>): NormalizedEvent | null {
    const timestamp = Date.now();
    const id = data.id || crypto.randomUUID();

    if (eventName === 'App\\Events\\ChatMessageEvent' || eventName === 'ChatMessageEvent') {
      return {
        id,
        platform: 'kick',
        type: 'chat_message',
        actor: {
          id: String(data.sender?.id || ''),
          username: data.sender?.username || 'kick_user',
          displayName: data.sender?.username || 'Kick User',
          badges: data.sender?.identity?.badges?.map((b: any) => b.type) || [],
        },
        payload: {
          message: data.content || '',
          rawPayload: data,
        },
        timestamp,
      };
    } else if (eventName === 'App\\Events\\SubscriptionEvent' || eventName === 'SubscriptionEvent') {
      return {
        id,
        platform: 'kick',
        type: 'subscription',
        actor: {
          username: data.username || 'sub_user',
          displayName: data.username || 'Kick Subscriber',
        },
        payload: {
          months: Number(data.months || 1),
          rawPayload: data,
        },
        timestamp,
      };
    } else if (eventName === 'App\\Events\\GiftedSubscriptionsEvent') {
      return {
        id,
        platform: 'kick',
        type: 'gift',
        actor: {
          username: data.gifter_username || 'anonymous',
          displayName: data.gifter_username || 'Anónimo',
        },
        payload: {
          amount: Number(data.gifted_usernames?.length || 1),
          rawPayload: data,
        },
        timestamp,
      };
    }

    return null;
  }
}

export const kickAdapter = new KickAdapter();
