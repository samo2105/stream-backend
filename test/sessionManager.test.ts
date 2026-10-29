import { describe, expect, test, beforeEach } from 'bun:test';
import { sessionManager } from '../src/services/sessionManager';

describe('Stream Session Lifecycle & Grace Period Suite', () => {
  beforeEach(() => {
    sessionManager._reset();
  });

  test('0 -> >=1 platforms creates an active session with live status', async () => {
    expect(sessionManager.getActiveSession()).toBeNull();

    const session = await sessionManager.updatePlatformStatuses([
      { platform: 'twitch', isLive: true, viewers: 15 },
      { platform: 'kick', isLive: false, viewers: null },
    ]);

    expect(session).not.toBeNull();
    expect(session?.status).toBe('live');
    expect(session?.activePlatforms).toContain('twitch');
    expect(sessionManager.getActiveSession()?.id).toBe(session?.id);
  });

  test('Session enters grace_period when platforms drop to 0', async () => {
    // 1. Start session
    await sessionManager.updatePlatformStatuses([
      { platform: 'twitch', isLive: true, viewers: 10 },
    ]);
    expect(sessionManager.getActiveSession()?.status).toBe('live');

    // 2. Both drop offline
    const graceSession = await sessionManager.updatePlatformStatuses([
      { platform: 'twitch', isLive: false, viewers: 0 },
    ]);

    expect(graceSession?.status).toBe('grace_period');
    expect(sessionManager.getActiveSession()).not.toBeNull();
  });

  test('Reconnecting during grace period restores live status without creating new session', async () => {
    // 1. Start session
    const original = await sessionManager.updatePlatformStatuses([
      { platform: 'twitch', isLive: true, viewers: 10 },
    ]);

    // 2. Drop offline (enters grace period)
    await sessionManager.updatePlatformStatuses([
      { platform: 'twitch', isLive: false, viewers: 0 },
    ]);
    expect(sessionManager.getActiveSession()?.status).toBe('grace_period');

    // 3. Kick comes online during grace period
    const restored = await sessionManager.updatePlatformStatuses([
      { platform: 'kick', isLive: true, viewers: 5 },
    ]);

    expect(restored?.status).toBe('live');
    expect(restored?.id).toBe(original?.id); // Same session preserved!
    expect(restored?.activePlatforms).toContain('kick');
  });

  test('OBS Studio StreamStopped signal ends session immediately', async () => {
    await sessionManager.handleObsSignal('StreamStarted');
    expect(sessionManager.getActiveSession()?.status).toBe('live');

    const ended = await sessionManager.handleObsSignal('StreamStopped');
    expect(ended?.status).toBe('ended');
    expect(ended?.endedAt).not.toBeNull();
    expect(sessionManager.getActiveSession()).toBeNull();
  });
});
