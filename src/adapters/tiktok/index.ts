import type { NormalizedEvent } from '../../types/events';

export class TikTokAdapter {
  /**
   * Parses live event data from TikTok Webcast push messages (Chat, Gifts, Follows, Shares).
   */
  parseWebcastEvent(eventType: string, data: Record<string, any>): NormalizedEvent | null {
    const timestamp = Date.now();
    const id = data.msgId || crypto.randomUUID();

    if (eventType === 'chat') {
      return {
        id,
        platform: 'tiktok',
        type: 'chat_message',
        actor: {
          id: data.userId,
          username: data.uniqueId || 'tiktok_user',
          displayName: data.nickname || data.uniqueId || 'TikTok User',
          avatarUrl: data.profilePictureUrl,
        },
        payload: {
          message: data.comment || '',
          rawPayload: data,
        },
        timestamp,
      };
    } else if (eventType === 'gift') {
      return {
        id,
        platform: 'tiktok',
        type: 'gift',
        actor: {
          id: data.userId,
          username: data.uniqueId || 'tiktok_user',
          displayName: data.nickname || data.uniqueId || 'TikTok User',
          avatarUrl: data.profilePictureUrl,
        },
        payload: {
          giftName: data.giftName || 'Gift',
          giftCount: Number(data.repeatCount || 1),
          amount: Number(data.diamondCount || 0),
          currency: 'DIAMONDS',
          rawPayload: data,
        },
        timestamp,
      };
    } else if (eventType === 'follow') {
      return {
        id,
        platform: 'tiktok',
        type: 'follow',
        actor: {
          id: data.userId,
          username: data.uniqueId || 'tiktok_user',
          displayName: data.nickname || data.uniqueId || 'TikTok User',
        },
        payload: {
          rawPayload: data,
        },
        timestamp,
      };
    }

    return null;
  }
}

export const tiktokAdapter = new TikTokAdapter();
