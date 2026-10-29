import { Hono } from 'hono';
import { sessionManager } from '../services/sessionManager';
import { getDb } from '../../db';

export const sessionRoutes = new Hono();

// GET /api/sessions/active
sessionRoutes.get('/active', (c) => {
  const active = sessionManager.getActiveSession();
  return c.json({ activeSession: active });
});

// POST /api/sessions/update-platforms (invoked by multiplatform poller)
sessionRoutes.post('/update-platforms', async (c) => {
  const body = await c.req.json();
  const statuses = Array.isArray(body.platforms) ? body.platforms : [];
  const updated = await sessionManager.updatePlatformStatuses(statuses);
  return c.json({ activeSession: updated });
});

// POST /api/sessions/obs-signal (invoked by OBS Studio connection / widget)
sessionRoutes.post('/obs-signal', async (c) => {
  const body = await c.req.json();
  const signal = body.signal as 'StreamStarted' | 'StreamStopped';
  if (signal !== 'StreamStarted' && signal !== 'StreamStopped') {
    return c.text('Señal inválida', 400);
  }
  const session = await sessionManager.handleObsSignal(signal);
  return c.json({ activeSession: session });
});

// GET /api/sessions/history
sessionRoutes.get('/history', async (c) => {
  const limit = Number(c.req.query('limit')) || 20;
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT * FROM stream_sessions
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;
    return c.json({ data: rows });
  } catch (e) {
    return c.json({ data: [] });
  }
});
