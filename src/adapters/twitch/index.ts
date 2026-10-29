import type { NormalizedEvent, EventType } from '../../types/events';

export class TwitchAdapter {
  /**
   * Verifies the Twitch-Eventsub-Message-Signature header against the raw body.
   */
  async verifySignature(
    messageId: string,
    timestamp: string,
    body: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    if (!messageId || !timestamp || !signature || !secret) {
      return false;
    }

    const message = messageId + timestamp + body;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(message)
    );

    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expectedSignature = `sha256=${hashHex}`;
    return signature === expectedSignature;
  }

  /**
   * Parses standard Twitch EventSub notifications into NormalizedEvent.
   */
  parseEventSub(subscriptionType: string, event: Record<string, any>): NormalizedEvent | null {
    const timestamp = Date.now();
    const id = event.id || crypto.randomUUID();

    switch (subscriptionType) {
      case 'channel.chat.message':
        return {
          id,
          platform: 'twitch',
          type: 'chat_message',
          actor: {
            id: event.chatter_user_id,
            username: event.chatter_user_login,
            displayName: event.chatter_user_name,
            badges: event.badges?.map((b: any) => b.set_id) || [],
          },
          payload: {
            message: event.message?.text || '',
            rawPayload: event,
          },
          timestamp,
        };

      case 'channel.follow':
        return {
          id,
          platform: 'twitch',
          type: 'follow',
          actor: {
            id: event.user_id,
            username: event.user_login,
            displayName: event.user_name,
          },
          payload: {
            rawPayload: event,
          },
          timestamp,
        };

      case 'channel.subscribe':
      case 'channel.subscription.message':
        return {
          id,
          platform: 'twitch',
          type: 'subscription',
          actor: {
            id: event.user_id,
            username: event.user_login,
            displayName: event.user_name,
          },
          payload: {
            tier: event.tier,
            months: event.cumulative_months || 1,
            message: event.message?.text,
            rawPayload: event,
          },
          timestamp,
        };

      case 'channel.cheer':
        return {
          id,
          platform: 'twitch',
          type: 'cheer',
          actor: {
            id: event.user_id,
            username: event.user_login || 'anonymous',
            displayName: event.user_name || 'Anónimo',
          },
          payload: {
            amount: event.bits,
            currency: 'BITS',
            message: event.message,
            rawPayload: event,
          },
          timestamp,
        };

      case 'channel.raid':
        return {
          id,
          platform: 'twitch',
          type: 'raid',
          actor: {
            id: event.from_broadcaster_user_id,
            username: event.from_broadcaster_user_login,
            displayName: event.from_broadcaster_user_name,
          },
          payload: {
            viewersCount: event.viewers,
            rawPayload: event,
          },
          timestamp,
        };

      default:
        return null;
    }
  }
}

export const twitchAdapter = new TwitchAdapter();
