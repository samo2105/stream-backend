import { describe, expect, test } from 'bun:test';
import { twitchAdapter } from '../src/adapters/twitch';
import { kickAdapter } from '../src/adapters/kick';
import { tiktokAdapter } from '../src/adapters/tiktok';
import { facebookAdapter } from '../src/adapters/facebook';
import { streamlabsAdapter } from '../src/adapters/streamlabs';
import { youtubeAdapter } from '../src/adapters/youtube';

describe('Adapters and Event Normalization Suite', () => {
  // 1. Twitch
  test('TwitchAdapter parses chat message correctly', () => {
    const raw = {
      chatter_user_id: '12345',
      chatter_user_login: 'zannito21',
      chatter_user_name: 'Zannito21',
      badges: [{ set_id: 'moderator' }, { set_id: 'subscriber' }],
      message: { text: '¡Hola a todos en el stream!' },
    };

    const normalized = twitchAdapter.parseEventSub('channel.chat.message', raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.platform).toBe('twitch');
    expect(normalized?.type).toBe('chat_message');
    expect(normalized?.actor.username).toBe('zannito21');
    expect(normalized?.actor.badges).toContain('moderator');
    expect(normalized?.payload.message).toBe('¡Hola a todos en el stream!');
  });

  test('TwitchAdapter parses cheer / bits correctly', () => {
    const raw = {
      user_id: '999',
      user_login: 'fan1',
      user_name: 'Fan1',
      bits: 500,
      message: '¡Buen directo!',
    };

    const normalized = twitchAdapter.parseEventSub('channel.cheer', raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.platform).toBe('twitch');
    expect(normalized?.type).toBe('cheer');
    expect(normalized?.payload.amount).toBe(500);
    expect(normalized?.payload.currency).toBe('BITS');
  });

  // 2. Kick
  test('KickAdapter parses ChatMessageEvent', () => {
    const raw = {
      id: 'kick-msg-1',
      content: 'Comentario en Kick',
      sender: {
        id: 777,
        username: 'kickviewer',
        identity: { badges: [{ type: 'sub' }] },
      },
    };

    const normalized = kickAdapter.parsePusherEvent('ChatMessageEvent', raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.platform).toBe('kick');
    expect(normalized?.type).toBe('chat_message');
    expect(normalized?.actor.username).toBe('kickviewer');
    expect(normalized?.payload.message).toBe('Comentario en Kick');
  });

  // 3. TikTok
  test('TikTokAdapter parses chat and gift events', () => {
    const chatRaw = {
      uniqueId: 'tt_user',
      nickname: 'TikTok Creator',
      comment: 'Saludos desde TikTok!',
    };

    const chatEv = tiktokAdapter.parseWebcastEvent('chat', chatRaw);
    expect(chatEv?.platform).toBe('tiktok');
    expect(chatEv?.type).toBe('chat_message');
    expect(chatEv?.payload.message).toBe('Saludos desde TikTok!');

    const giftRaw = {
      uniqueId: 'supporter',
      nickname: 'Top Supporter',
      giftName: 'Rosa',
      repeatCount: 10,
      diamondCount: 10,
    };

    const giftEv = tiktokAdapter.parseWebcastEvent('gift', giftRaw);
    expect(giftEv?.platform).toBe('tiktok');
    expect(giftEv?.type).toBe('gift');
    expect(giftEv?.payload.giftName).toBe('Rosa');
    expect(giftEv?.payload.amount).toBe(10);
    expect(giftEv?.payload.currency).toBe('DIAMONDS');
  });

  // 4. Facebook Live
  test('FacebookAdapter parses live comments and stars', () => {
    const entry = {
      changes: [
        {
          field: 'live_comments',
          value: {
            comment_id: 'fb_c_123',
            from: { id: 'fb_u_1', name: 'Carlos Gomez' },
            message: 'Excelente partida en vivo!',
            created_time: '2026-10-29T02:00:00Z',
          },
        },
        {
          field: 'stars',
          value: {
            id: 'fb_star_1',
            from: { id: 'fb_u_2', name: 'Maria Lopez' },
            stars_amount: 150,
            message: 'Te apoyo con estrellas!',
          },
        },
      ],
    };

    const events = facebookAdapter.parseWebhookEntry(entry);
    expect(events.length).toBe(2);

    expect(events[0].platform).toBe('facebook');
    expect(events[0].type).toBe('chat_message');
    expect(events[0].payload.message).toBe('Excelente partida en vivo!');

    expect(events[1].platform).toBe('facebook');
    expect(events[1].type).toBe('cheer');
    expect(events[1].payload.amount).toBe(150);
    expect(events[1].payload.currency).toBe('STARS');
  });

  // 5. Streamlabs
  test('StreamlabsAdapter parses donation webhook', () => {
    const payload = {
      type: 'donation',
      message: [
        {
          _id: 'sl-123',
          name: 'SuperFan',
          amount: '25.00',
          currency: 'USD',
          comment: 'Para apoyar el stream!',
        },
      ],
    };

    const events = streamlabsAdapter.parseWebhook(payload);
    expect(events.length).toBe(1);
    expect(events[0].platform).toBe('streamlabs');
    expect(events[0].type).toBe('donation');
    expect(events[0].payload.amount).toBe(25);
    expect(events[0].payload.currency).toBe('USD');
  });

  // 6. YouTube
  test('YouTubeAdapter parses live chat message and Super Chat donation', () => {
    const msgRaw = {
      id: 'yt-msg-1',
      authorDetails: {
        channelId: 'yt-chan-1',
        displayName: 'Pedro YT',
      },
      snippet: {
        publishedAt: '2026-10-29T02:30:00Z',
        textMessageDetails: {
          messageText: 'Comentario en directo de YouTube',
        },
      },
    };

    const chatEv = youtubeAdapter.parseLiveChatMessage(msgRaw);
    expect(chatEv?.platform).toBe('youtube');
    expect(chatEv?.type).toBe('chat_message');
    expect(chatEv?.payload.message).toBe('Comentario en directo de YouTube');

    const superChatRaw = {
      id: 'yt-sc-1',
      authorDetails: {
        channelId: 'yt-chan-2',
        displayName: 'Donador YT',
      },
      snippet: {
        publishedAt: '2026-10-29T02:31:00Z',
        superChatDetails: {
          amountMicros: '50000000',
          currency: 'USD',
          userComment: 'Gran jugada!',
        },
      },
    };

    const superChatEv = youtubeAdapter.parseLiveChatMessage(superChatRaw);
    expect(superChatEv?.platform).toBe('youtube');
    expect(superChatEv?.type).toBe('donation');
    expect(superChatEv?.payload.amount).toBe(50);
    expect(superChatEv?.payload.currency).toBe('USD');
  });
});
