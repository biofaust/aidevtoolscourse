import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { io as Client } from 'socket.io-client';
import serverBundle from '../src/server';

const { app, httpServer, sessions } = serverBundle;

const waitFor = (socket, event, timeout = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

describe('client-server integration', () => {
  let server;
  let port;
  let baseUrl;

  beforeAll(async () => {
    server = await new Promise((resolve) => {
      const listener = httpServer.listen(0, () => resolve(listener));
    });
    port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  beforeEach(() => {
    sessions.clear();
  });

  it('creates and reads sessions via HTTP', async () => {
    const request = supertest(baseUrl);
    const payload = { code: 'console.log("hello");', language: 'javascript' };

    const createRes = await request.post('/api/sessions').send(payload).expect(201);
    const { sessionId } = createRes.body;

    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(10);

    const fetchRes = await request.get(`/api/sessions/${sessionId}`).expect(200);
    expect(fetchRes.body.code).toBe(payload.code);
    expect(fetchRes.body.language).toBe(payload.language);
  });

  it('syncs code updates and broadcasts run results between collaborators', async () => {
    const request = supertest(baseUrl);
    const payload = { code: 'console.log("start");', language: 'javascript' };
    const sessionId = (await request.post('/api/sessions').send(payload).expect(201)).body.sessionId;

    const clientA = new Client(baseUrl, { transports: ['websocket'] });
    const clientB = new Client(baseUrl, { transports: ['websocket'] });

    try {
      await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

      clientA.emit('join-session', { sessionId });
      clientB.emit('join-session', { sessionId });

      const initialState = await waitFor(clientB, 'session-state');
      expect(initialState.code).toBe(payload.code);

      const updatedCode = 'console.log("updated");';
      const updatePromise = waitFor(clientB, 'code-update');
      clientA.emit('code-update', { sessionId, code: updatedCode, language: 'javascript' });
      const update = await updatePromise;
      expect(update.code).toBe(updatedCode);
      expect(update.language).toBe('javascript');

      const runPromise = waitFor(clientB, 'run-result');
      clientA.emit('broadcast-run', { sessionId, output: 'Result: 123' });
      const run = await runPromise;
      expect(run.output).toBe('Result: 123');
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });
});
