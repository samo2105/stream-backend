import type { NormalizedEvent } from '../../types/events';

export class FacebookAdapter {
  /**
   * Verifies the X-Hub-Signature-256 header sent by Meta Webhooks.
   */
  async verifySignature(
    rawBody: string,
    signatureHeader: string,
    appSecret: string
  ): Promise<boolean> {
    if (!signatureHeader || !appSecret || !rawBody) {
      return false;
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(appSecret);

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
      encoder.encode(rawBody)
    );

    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const expectedSignature = `sha256=${hashHex}`;
    return signatureHeader === expectedSignature;
  }

  /**
   * Parses live video comments and star events from Facebook Graph Webhook payloads.
   */
  parseWebhookEntry(entry: Record<string, any>): NormalizedEvent[] {
    const events: NormalizedEvent[] = [];
    const timestamp = Date.now();

    const changes = entry.changes || [];
    for (const change of changes) {
      const field = change.field;
      const val = change.value;
      if (!val) continue;

      if (field === 'live_comments' || field === 'feed') {
        events.push({
          id: val.comment_id || val.id || crypto.randomUUID(),
          platform: 'facebook',
          type: 'chat_message',
          actor: {
            id: val.from?.id,
            username: val.from?.name?.toLowerCase().replace(/\s+/g, '') || 'fb_user',
            displayName: val.from?.name || 'Facebook User',
          },
          payload: {
            message: val.message || '',
            rawPayload: val,
          },
          timestamp: val.created_time ? new Date(val.created_time).getTime() : timestamp,
        });
      } else if (field === 'stars' || val.stars_amount) {
        events.push({
          id: val.id || crypto.randomUUID(),
          platform: 'facebook',
          type: 'cheer',
          actor: {
            id: val.from?.id,
            username: val.from?.name?.toLowerCase().replace(/\s+/g, '') || 'fb_user',
            displayName: val.from?.name || 'Facebook User',
          },
          payload: {
            amount: Number(val.stars_amount || val.amount || 0),
            currency: 'STARS',
            message: val.message,
            rawPayload: val,
          },
          timestamp,
        });
      }
    }

    return events;
  }
}

export const facebookAdapter = new FacebookAdapter();
