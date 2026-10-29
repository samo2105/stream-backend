import { Hono } from 'hono';
import { getDb } from '../../db';
import { wsHub } from '../websocket/hub';

export const healthRoutes = new Hono();

healthRoutes.get('/', async (c) => {
  const memory = process.memoryUsage();
  let dbStatus = 'disconnected';

  try {
    const sql = getDb();
    const [res] = await sql`SELECT 1 as alive`;
    if (res?.alive === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'error';
  }

  return c.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    activeWsClients: wsHub.getClientCount(),
    memory: {
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
    },
  });
});
