import { describe, expect, test } from 'bun:test';
import { viewerService } from '../src/services/viewerService';
import { wsHub } from '../src/websocket/hub';

describe('Viewer Service & WebSocket Hub Suite', () => {
  test('ViewerService records snapshot correctly with nulls for unlinked platforms', async () => {
    // Streamer only broadcasts on Twitch and Kick, other platforms are unlinked (null)
    const snapshot = await viewerService.recordSnapshot({
      twitch: 25,
      kick: 10,
      youtube: null,
      tiktok: null,
      facebook: null,
    });

    expect(snapshot.twitchViewers).toBe(25);
    expect(snapshot.kickViewers).toBe(10);
    expect(snapshot.youtubeViewers).toBeNull();
    expect(snapshot.tiktokViewers).toBeNull();
    expect(snapshot.facebookViewers).toBeNull();
    // Total viewers is 25 + 10 = 35
    expect(snapshot.totalViewers).toBe(35);
    expect(snapshot.recordedAt).toBeDefined();
  });

  test('WebSocketHub registers, unregisters, and handles ping/pong', () => {
    let sentMessage: string | null = null;
    const mockWs = {
      send: (msg: string) => {
        sentMessage = msg;
      },
    } as any;

    expect(wsHub.getClientCount()).toBe(0);

    wsHub.register(mockWs);
    expect(wsHub.getClientCount()).toBe(1);

    // Test ping message
    wsHub.handleMessage(mockWs, JSON.stringify({ type: 'ping' }));
    expect(sentMessage).not.toBeNull();
    const parsed = JSON.parse(sentMessage!);
    expect(parsed.type).toBe('pong');
    expect(typeof parsed.timestamp).toBe('number');

    // Test broadcast
    sentMessage = null;
    wsHub.broadcast({
      type: 'event',
      data: {
        id: 'test-1',
        platform: 'twitch',
        type: 'chat_message',
        actor: { username: 'testuser', displayName: 'TestUser' },
        payload: { message: 'Hola mundo' },
        timestamp: Date.now(),
      },
    });

    expect(sentMessage).not.toBeNull();
    const broadcasted = JSON.parse(sentMessage!);
    expect(broadcasted.type).toBe('event');
    expect(broadcasted.data.payload.message).toBe('Hola mundo');

    wsHub.unregister(mockWs);
    expect(wsHub.getClientCount()).toBe(0);
  });
});
