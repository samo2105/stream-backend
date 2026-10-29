import { describe, expect, test } from 'bun:test';
import { twitchAdapter } from '../src/adapters/twitch';
import { facebookAdapter } from '../src/adapters/facebook';
import app from '../src/index';

describe('Webhooks Security & HTTP Endpoints Suite', () => {
  test('Twitch HMAC verification validates authentic signatures and rejects tampered ones', async () => {
    const messageId = 'msg-123';
    const timestamp = '2026-10-29T02:00:00Z';
    const body = JSON.stringify({ test: 'payload' });
    const secret = 'super_secret_twitch_key';

    // Calculate valid signature
    const message = messageId + timestamp + body;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const validSignature = `sha256=${hashHex}`;

    const isValid = await twitchAdapter.verifySignature(messageId, timestamp, body, validSignature, secret);
    expect(isValid).toBe(true);

    const isTampered = await twitchAdapter.verifySignature(messageId, timestamp, body, 'sha256=invalid', secret);
    expect(isTampered).toBe(false);
  });

  test('Facebook HMAC verification validates X-Hub-Signature-256', async () => {
    const rawBody = '{"entry": []}';
    const secret = 'meta_app_secret';

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const validSignature = `sha256=${hashHex}`;

    const isValid = await facebookAdapter.verifySignature(rawBody, validSignature, secret);
    expect(isValid).toBe(true);

    const isTampered = await facebookAdapter.verifySignature(rawBody, 'sha256=wrong', secret);
    expect(isTampered).toBe(false);
  });

  test('GET /healthz returns status ok and memory statistics', async () => {
    const req = new Request('http://localhost:3000/healthz');
    const res = await app.fetch(req, {} as any);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.memory.rssMb).toBe('number');
    expect(typeof data.activeWsClients).toBe('number');
  });

  test('GET /api/webhooks/facebook responds to hub.challenge correctly', async () => {
    const req = new Request(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=dev_fb_verify_token&hub.challenge=11582012'
    );
    const res = await app.fetch(req, {} as any);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('11582012');
  });

  test('GET /api/webhooks/facebook rejects invalid verify_token with 403', async () => {
    const req = new Request(
      'http://localhost:3000/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=11582012'
    );
    const res = await app.fetch(req, {} as any);
    expect(res.status).toBe(403);
  });
});
