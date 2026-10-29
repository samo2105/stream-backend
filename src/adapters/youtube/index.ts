import type { NormalizedEvent } from '../../types/events';

export class YouTubeAdapter {
  /**
   * Parses live chat message items from YouTube Data API v3 liveChatMessages.list
   */
  parseLiveChatMessage(item: Record<string, any>): NormalizedEvent | null {
    const timestamp = item.snippet?.publishedAt 
      ? new Date(item.snippet.publishedAt).getTime() 
      : Date.now();
    const id = item.id || crypto.randomUUID();

    const author = item.authorDetails || {};
    const textDetails = item.snippet?.textMessageDetails || {};
    const superChat = item.snippet?.superChatDetails;
    const superSticker = item.snippet?.superStickerDetails;

    if (superChat) {
      return {
        id,
        platform: 'youtube',
        type: 'donation',
        actor: {
          id: author.channelId,
          username: author.displayName?.toLowerCase().replace(/\s+/g, '') || 'yt_user',
          displayName: author.displayName || 'YouTube User',
          avatarUrl: author.profileImageUrl,
        },
        payload: {
          message: superChat.userComment,
          amount: Number(superChat.amountMicros) / 1000000,
          currency: superChat.currency || 'USD',
          rawPayload: item,
        },
        timestamp,
      };
    }

    if (superSticker) {
      return {
        id,
        platform: 'youtube',
        type: 'gift',
        actor: {
          id: author.channelId,
          username: author.displayName?.toLowerCase().replace(/\s+/g, '') || 'yt_user',
          displayName: author.displayName || 'YouTube User',
          avatarUrl: author.profileImageUrl,
        },
        payload: {
          giftName: superSticker.superStickerMetadata?.altText || 'Sticker',
          amount: Number(superSticker.amountMicros) / 1000000,
          currency: superSticker.currency || 'USD',
          rawPayload: item,
        },
        timestamp,
      };
    }

    return {
      id,
      platform: 'youtube',
      type: 'chat_message',
      actor: {
        id: author.channelId,
        username: author.displayName?.toLowerCase().replace(/\s+/g, '') || 'yt_user',
        displayName: author.displayName || 'YouTube User',
        avatarUrl: author.profileImageUrl,
      },
      payload: {
        message: textDetails.messageText || '',
        rawPayload: item,
      },
      timestamp,
    };
  }
}

export const youtubeAdapter = new YouTubeAdapter();
