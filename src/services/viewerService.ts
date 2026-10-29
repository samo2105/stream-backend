import { getDb } from '../../db';
import type { ViewerSnapshot } from '../types/sessions';
import { wsHub } from '../websocket/hub';
import { sessionManager } from './sessionManager';

export interface RecordSnapshotParams {
  twitch?: number | null;
  kick?: number | null;
  youtube?: number | null;
  tiktok?: number | null;
  facebook?: number | null;
}

export class ViewerService {
  /**
   * Records a periodic snapshot of concurrent viewers across platforms.
   * If a platform is unlinked or unconfigured, its value is null.
   * The total calculates the sum of all active non-null platforms.
   */
  async recordSnapshot(counts: RecordSnapshotParams): Promise<ViewerSnapshot> {
    const activeSession = sessionManager.getActiveSession();

    // Calculate total from all non-null platforms
    const total = 
      (typeof counts.twitch === 'number' ? Math.max(0, counts.twitch) : 0) +
      (typeof counts.kick === 'number' ? Math.max(0, counts.kick) : 0) +
      (typeof counts.youtube === 'number' ? Math.max(0, counts.youtube) : 0) +
      (typeof counts.tiktok === 'number' ? Math.max(0, counts.tiktok) : 0) +
      (typeof counts.facebook === 'number' ? Math.max(0, counts.facebook) : 0);

    const snapshot: ViewerSnapshot = {
      sessionId: activeSession ? activeSession.id : null,
      twitchViewers: counts.twitch ?? null,
      kickViewers: counts.kick ?? null,
      youtubeViewers: counts.youtube ?? null,
      tiktokViewers: counts.tiktok ?? null,
      facebookViewers: counts.facebook ?? null,
      totalViewers: total,
      recordedAt: new Date().toISOString(),
    };

    if (activeSession) {
      await sessionManager.recordViewerCount(total);
    }

    try {
      const sql = getDb();
      const [inserted] = await sql`
        INSERT INTO viewer_snapshots (
          session_id,
          twitch_viewers,
          kick_viewers,
          youtube_viewers,
          tiktok_viewers,
          facebook_viewers,
          total_viewers,
          recorded_at
        ) VALUES (
          ${snapshot.sessionId},
          ${snapshot.twitchViewers},
          ${snapshot.kickViewers},
          ${snapshot.youtubeViewers},
          ${snapshot.tiktokViewers},
          ${snapshot.facebookViewers},
          ${snapshot.totalViewers},
          ${snapshot.recordedAt}
        )
        RETURNING id
      `;
      if (inserted) {
        snapshot.id = Number(inserted.id);
      }
    } catch (e) {
      console.error('Error insertando viewer_snapshots en DB:', e);
    }

    wsHub.broadcast({ type: 'viewer_snapshot', data: snapshot });
    return snapshot;
  }

  async getRecentSnapshots(limit: number = 60, sessionId?: string): Promise<ViewerSnapshot[]> {
    try {
      const sql = getDb();
      const rows = sessionId
        ? await sql`
            SELECT * FROM viewer_snapshots
            WHERE session_id = ${sessionId}
            ORDER BY recorded_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT * FROM viewer_snapshots
            ORDER BY recorded_at DESC
            LIMIT ${limit}
          `;

      return rows.map((r: any) => ({
        id: Number(r.id),
        sessionId: r.session_id,
        twitchViewers: r.twitch_viewers !== null ? Number(r.twitch_viewers) : null,
        kickViewers: r.kick_viewers !== null ? Number(r.kick_viewers) : null,
        youtubeViewers: r.youtube_viewers !== null ? Number(r.youtube_viewers) : null,
        tiktokViewers: r.tiktok_viewers !== null ? Number(r.tiktok_viewers) : null,
        facebookViewers: r.facebook_viewers !== null ? Number(r.facebook_viewers) : null,
        totalViewers: Number(r.total_viewers),
        recordedAt: new Date(r.recorded_at).toISOString(),
      }));
    } catch (e) {
      console.error('Error consultando viewer_snapshots:', e);
      return [];
    }
  }
}

export const viewerService = new ViewerService();
