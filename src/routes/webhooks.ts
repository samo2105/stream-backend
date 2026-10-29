import { Hono } from 'hono';
import { twitchAdapter } from '../adapters/twitch';
import { facebookAdapter } from '../adapters/facebook';
import { streamlabsAdapter } from '../adapters/streamlabs';
import { eventService } from '../services/eventService';
import { config } from '../config';

export const webhookRoutes = new Hono();

// ==========================================
// 1. Twitch EventSub Webhook
// ==========================================
webhookRoutes.post('/twitch', async (c) => {
  const messageId = c.req.header('twitch-eventsub-message-id') || '';
  const timestamp = c.req.header('twitch-eventsub-message-timestamp') || '';
  const signature = c.req.header('twitch-eventsub-message-signature') || '';
  const messageType = c.req.header('twitch-eventsub-message-type') || '';

  const rawBody = await c.req.text();

  // Verify HMAC-SHA256 signature
  const isValid = await twitchAdapter.verifySignature(
    messageId,
    timestamp,
    rawBody,
    signature,
    config.TWITCH_EVENTSUB_SECRET
  );

  if (!isValid) {
    return c.text('Firma inválida', 403);
  }

  const payload = JSON.parse(rawBody);

  // Twitch webhook verification handshake
  if (messageType === 'webhook_callback_verification') {
    return c.text(payload.challenge, 200, {
      'Content-Type': 'text/plain',
    });
  }

  // Handle actual notification
  if (messageType === 'notification') {
    const subType = payload.subscription?.type;
    const event = payload.event;
    const normalized = twitchAdapter.parseEventSub(subType, event);
    if (normalized) {
      await eventService.processEvent(normalized);
    }
    return c.text('', 204);
  }

  return c.text('Ignorado', 200);
});

// ==========================================
// 2. Facebook Graph API Webhook
// ==========================================
// GET for webhook verification handshake
webhookRoutes.get('/facebook', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode === 'subscribe' && token === config.FACEBOOK_VERIFY_TOKEN) {
    return c.text(challenge || '', 200);
  }

  return c.text('Verificación fallida', 403);
});

// POST for live comments / stars
webhookRoutes.post('/facebook', async (c) => {
  const signature = c.req.header('x-hub-signature-256') || '';
  const rawBody = await c.req.text();

  const isValid = await facebookAdapter.verifySignature(
    rawBody,
    signature,
    config.FACEBOOK_APP_SECRET
  );

  if (!isValid) {
    return c.text('Firma inválida', 403);
  }

  const payload = JSON.parse(rawBody);
  const entries = payload.entry || [];

  for (const entry of entries) {
    const events = facebookAdapter.parseWebhookEntry(entry);
    for (const ev of events) {
      await eventService.processEvent(ev);
    }
  }

  return c.text('EVENT_RECEIVED', 200);
});

// ==========================================
// 3. Streamlabs Webhook
// ==========================================
webhookRoutes.post('/streamlabs', async (c) => {
  const token = c.req.header('x-streamlabs-token') || c.req.query('token');
  if (config.STREAMLABS_SECRET_TOKEN && token !== config.STREAMLABS_SECRET_TOKEN) {
    return c.text('No autorizado', 401);
  }

  const payload = await c.req.json();
  const events = streamlabsAdapter.parseWebhook(payload);

  for (const ev of events) {
    await eventService.processEvent(ev);
  }

  return c.json({ success: true, processed: events.length });
});
