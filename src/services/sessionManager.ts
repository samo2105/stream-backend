import { getDb } from '../../db';
import type { StreamSession, PlatformLiveStatus, SessionStatus } from '../types/sessions';
import type { PlatformName } from '../types/events';
import { wsHub } from '../websocket/hub';
import { config } from '../config';

export class SessionManager {
  private activeSession: StreamSession | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private platformStatusMap = new Map<PlatformName, boolean>();

  getActiveSession(): StreamSession | null {
    return this.activeSession;
  }

  /**
   * Evaluates the multiplatform live states and manages stream_sessions transitions:
   * 1. 0 -> >=1 platforms: Create / start new stream session.
   * 2. Any active platforms during grace period: Cancel grace period, maintain active session.
   * 3. >=1 -> 0 platforms: Enter grace period (3 min).
   * 4. Expiration of grace period: Finalize and close stream session in database.
   */
  async updatePlatformStatuses(statuses: PlatformLiveStatus[]): Promise<StreamSession | null> {
    for (const s of statuses) {
      this.platformStatusMap.set(s.platform, s.isLive);
    }

    const livePlatforms = Array.from(this.platformStatusMap.entries())
      .filter(([_, isLive]) => isLive)
      .map(([platform]) => platform);

    const hasLivePlatforms = livePlatforms.length > 0;

    // Case 1: Currently NO active session and platforms just went live
    if (!this.activeSession && hasLivePlatforms) {
      return await this.startSession(livePlatforms);
    }

    // Case 2: Currently active session
    if (this.activeSession) {
      // If we were in grace period and at least 1 platform is back online
      if (this.graceTimer && hasLivePlatforms) {
        clearTimeout(this.graceTimer);
        this.graceTimer = null;
        this.activeSession.status = 'live';
        this.activeSession.activePlatforms = Array.from(
          new Set([...this.activeSession.activePlatforms, ...livePlatforms])
        );
        await this.syncSessionToDb(this.activeSession);
        wsHub.broadcast({ type: 'session_update', data: this.activeSession });
        return this.activeSession;
      }

      // If active session, update active platforms set
      if (hasLivePlatforms) {
        const updated = Array.from(
          new Set([...this.activeSession.activePlatforms, ...livePlatforms])
        );
        if (updated.length !== this.activeSession.activePlatforms.length) {
          this.activeSession.activePlatforms = updated;
          await this.syncSessionToDb(this.activeSession);
        }
      }

      // If all platforms went offline and we haven't started grace period yet
      if (!hasLivePlatforms && !this.graceTimer) {
        this.activeSession.status = 'grace_period';
        wsHub.broadcast({ type: 'session_update', data: this.activeSession });

        this.graceTimer = setTimeout(async () => {
          await this.endSession();
        }, config.SESSION_GRACE_PERIOD_MS);
      }
    }

    return this.activeSession;
  }

  /**
   * Explicit signal from OBS Studio (OutputStarted or OutputStopped)
   */
  async handleObsSignal(signal: 'StreamStarted' | 'StreamStopped'): Promise<StreamSession | null> {
    if (signal === 'StreamStarted') {
      if (this.graceTimer) {
        clearTimeout(this.graceTimer);
        this.graceTimer = null;
      }
      if (!this.activeSession) {
        return await this.startSession([]);
      }
      this.activeSession.status = 'live';
      return this.activeSession;
    } else if (signal === 'StreamStopped') {
      if (this.activeSession) {
        return await this.endSession();
      }
    }
    return null;
  }

  async recordViewerCount(totalViewers: number): Promise<void> {
    if (!this.activeSession) return;
    if (totalViewers > this.activeSession.peakViewers) {
      this.activeSession.peakViewers = totalViewers;
      await this.syncSessionToDb(this.activeSession);
      wsHub.broadcast({ type: 'session_update', data: this.activeSession });
    }
  }

  async incrementEventCount(): Promise<void> {
    if (!this.activeSession) return;
    this.activeSession.totalEvents += 1;
    await this.syncSessionToDb(this.activeSession);
  }

  private async startSession(platforms: PlatformName[]): Promise<StreamSession> {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }

    const session: StreamSession = {
      id: crypto.randomUUID(),
      title: 'Transmisión en Vivo Multistream',
      startedAt: new Date().toISOString(),
      endedAt: null,
      peakViewers: 0,
      averageViewers: 0,
      totalEvents: 0,
      activePlatforms: platforms,
      status: 'live',
    };

    this.activeSession = session;

    try {
      const sql = getDb();
      await sql`
        INSERT INTO stream_sessions (id, title, started_at, peak_viewers, average_viewers, total_events, active_platforms, status)
        VALUES (
          ${session.id},
          ${session.title ?? null},
          ${session.startedAt},
          ${session.peakViewers},
          ${session.averageViewers},
          ${session.totalEvents},
          ${JSON.stringify(session.activePlatforms)},
          ${session.status}
        )
      `;
    } catch (e) {
      console.error('Error insertando stream_sessions en DB:', e);
    }

    wsHub.broadcast({ type: 'session_update', data: session });
    return session;
  }

  async endSession(): Promise<StreamSession | null> {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }

    if (!this.activeSession) return null;

    const endedSession: StreamSession = {
      ...this.activeSession,
      endedAt: new Date().toISOString(),
      status: 'ended',
    };

    try {
      const sql = getDb();
      await sql`
        UPDATE stream_sessions
        SET ended_at = ${endedSession.endedAt},
            peak_viewers = ${endedSession.peakViewers},
            average_viewers = ${endedSession.averageViewers},
            total_events = ${endedSession.totalEvents},
            active_platforms = ${JSON.stringify(endedSession.activePlatforms)},
            status = 'ended'
        WHERE id = ${endedSession.id}
      `;
    } catch (e) {
      console.error('Error cerrando stream_sessions en DB:', e);
    }

    this.activeSession = null;
    this.platformStatusMap.clear();

    wsHub.broadcast({ type: 'session_update', data: endedSession });
    return endedSession;
  }

  private async syncSessionToDb(session: StreamSession): Promise<void> {
    try {
      const sql = getDb();
      await sql`
        UPDATE stream_sessions
        SET peak_viewers = ${session.peakViewers},
            average_viewers = ${session.averageViewers},
            total_events = ${session.totalEvents},
            active_platforms = ${JSON.stringify(session.activePlatforms)},
            status = ${session.status}
        WHERE id = ${session.id}
      `;
    } catch (e) {
      console.error('Error sincronizando stream_sessions en DB:', e);
    }
  }

  /**
   * Used for testing only: resets internal state
   */
  _reset(): void {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    this.activeSession = null;
    this.platformStatusMap.clear();
  }
}

export const sessionManager = new SessionManager();
