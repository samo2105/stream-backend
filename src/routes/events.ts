import { Hono } from 'hono';
import { eventService } from '../services/eventService';
import { viewerService } from '../services/viewerService';

export const eventRoutes = new Hono();

// GET /api/events?limit=50&platform=twitch
eventRoutes.get('/', async (c) => {
  const limit = Number(c.req.query('limit')) || 50;
  const platform = c.req.query('platform');
  const events = await eventService.getRecentEvents(limit, platform);
  return c.json({ data: events });
});

// POST /api/events/normalize (useful for manual ingestion / adapters)
eventRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const processed = await eventService.processEvent(body);
  return c.json({ success: true, data: processed });
});

// POST /api/events/snapshots (record viewer count snapshot)
eventRoutes.post('/snapshots', async (c) => {
  const body = await c.req.json();
  const snapshot = await viewerService.recordSnapshot({
    twitch: body.twitch ?? null,
    kick: body.kick ?? null,
    youtube: body.youtube ?? null,
    tiktok: body.tiktok ?? null,
    facebook: body.facebook ?? null,
  });
  return c.json({ success: true, data: snapshot });
});

// GET /api/events/snapshots
eventRoutes.get('/snapshots', async (c) => {
  const limit = Number(c.req.query('limit')) || 60;
  const sessionId = c.req.query('sessionId');
  const snapshots = await viewerService.getRecentSnapshots(limit, sessionId);
  return c.json({ data: snapshots });
});
