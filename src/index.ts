import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { wsHub } from './websocket/hub';
import { webhookRoutes } from './routes/webhooks';
import { healthRoutes } from './routes/health';
import { eventRoutes } from './routes/events';
import { sessionRoutes } from './routes/sessions';
import { config } from './config';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({ origin: '*' }));

// API Routes
app.route('/healthz', healthRoutes);
app.route('/api/webhooks', webhookRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/sessions', sessionRoutes);

// Root welcome
app.get('/', (c) => {
  return c.json({
    service: 'stream-backend',
    version: '1.0.0',
    runtime: 'Bun + Hono',
    documentation: '/healthz',
  });
});

console.log(`🚀 Stream Backend iniciando en puerto ${config.PORT}...`);

export default {
  port: config.PORT,
  fetch(req: Request, server: any) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined;
      }
      return new Response('Error al actualizar a WebSocket', { status: 400 });
    }
    return app.fetch(req, { server });
  },
  websocket: {
    open(ws: any) {
      wsHub.register(ws);
    },
    message(ws: any, message: string | Buffer) {
      wsHub.handleMessage(ws, message);
    },
    close(ws: any) {
      wsHub.unregister(ws);
    },
  },
};
