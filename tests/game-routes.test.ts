// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGameRoutes } from '../server/game-routes';
import { maxDrawingPoints, maxNameLength, maxRemotePlayers, simplePlayerSchema } from '../src/types/types';

const guest = { name: 'Jo', drawing: { x: [1], y: [2], drag: [false], width: 960, height: 960, color: '#123' } };
type Routes = ReturnType<typeof createGameRoutes>;

async function openRoom(app: Routes) {
  const response = await app.request('/rtd');
  if (!response.ok || !response.body) throw new Error('Room did not open');
  const reader = response.body.getReader();
  const readEvent = async () => {
    const { value } = await reader.read();
    const data = new TextDecoder().decode(value).match(/^data: (.+)$/m)?.[1];
    if (!data) throw new Error('Missing event data');
    return JSON.parse(data) as { id: string; name?: string };
  };
  const { id } = await readEvent();
  return { id, readEvent, close: () => reader.cancel() };
}

function join(app: Routes, id: string, body = JSON.stringify(guest)) {
  return app.request(`/join/${id}`, { method: 'POST', body });
}

describe('game admissions', () => {
  it('accepts the drawing client format and bounds names, geometry and point counts', () => {
    expect(simplePlayerSchema.safeParse(guest).success).toBe(true);
    for (const drawing of [
      { ...guest.drawing, width: 0 },
      { ...guest.drawing, width: 2049 },
      { ...guest.drawing, width: 2048, height: 2048 },
      { ...guest.drawing, y: [] },
      { ...guest.drawing, x: [961] },
      { ...guest.drawing, x: Array(maxDrawingPoints + 1).fill(0) },
    ])
      expect(simplePlayerSchema.safeParse({ ...guest, drawing }).success).toBe(false);
    for (const name of [' ', 'a'.repeat(maxNameLength + 1)]) {
      expect(simplePlayerSchema.safeParse({ ...guest, name }).success).toBe(false);
    }
  });

  it('checks game existence before parsing and caps declared and streamed bodies', async () => {
    const app = createGameRoutes();
    expect((await join(app, 'missing', 'invalid')).status).toBe(404);
    const room = await openRoom(app);
    try {
      expect(room.id).toMatch(/^[a-z2-9]{6}$/);
      expect((await join(app, room.id, 'invalid')).status).toBe(400);
      const path = `/join/${room.id}`;
      expect(
        (await app.request(path, { method: 'POST', headers: { 'content-length': '200000' }, body: 'x' })).status,
      ).toBe(413);
      expect((await join(app, room.id, ' '.repeat(192 * 1024 + 1))).status).toBe(413);
      expect((await join(app, room.id)).status).toBe(204);
      expect((await room.readEvent()).name).toBe('Jo');
    } finally {
      await room.close();
    }
  });

  it('keeps an existing stream when an invite collides and frees closed rooms', async () => {
    const ids = ['first', 'first', 'second'];
    const app = createGameRoutes(() => {
      const id = ids.shift();
      if (!id) throw new Error('Unexpected invite allocation');
      return id;
    });
    const first = await openRoom(app);
    const second = await openRoom(app);
    try {
      expect([first.id, second.id]).toEqual(['first', 'second']);
      await first.close();
      expect((await join(app, first.id)).status).toBe(404);
      expect((await join(app, second.id.toUpperCase())).status).toBe(204);
      expect((await second.readEvent()).name).toBe('Jo');
    } finally {
      await second.close();
    }
  });

  it('reserves the last seat once and only releases a seat with its host-issued credential', async () => {
    const app = createGameRoutes();
    const room = await openRoom(app);
    try {
      let playerId = '';
      for (let i = 0; i < maxRemotePlayers - 1; i++) {
        expect((await join(app, room.id)).status).toBe(204);
        playerId = (await room.readEvent()).id;
      }
      const results = await Promise.all([join(app, room.id), join(app, room.id)]);
      expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
      await room.readEvent();
      const remove = (token: string) =>
        app.request(`/join/${room.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      expect((await remove('unknown')).status).toBe(404);
      expect((await join(app, room.id)).status).toBe(409);
      expect((await remove(playerId)).status).toBe(204);
      expect((await join(app, room.id)).status).toBe(204);
      await room.readEvent();
    } finally {
      await room.close();
    }
  });

  it('renews creation and join budgets after the window closes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const app = createGameRoutes();
    try {
      for (let i = 0; i < 60; i++) await (await openRoom(app)).close();
      const limited = await app.request('/rtd');
      expect(limited.status).toBe(429);
      expect(limited.headers.get('Retry-After')).toBe('60');
      vi.advanceTimersByTime(60_000);
      const room = await openRoom(app);
      try {
        for (let i = 0; i < 120; i++) expect((await join(app, room.id, '{}')).status).toBe(400);
        expect((await join(app, room.id)).status).toBe(429);
        vi.advanceTimersByTime(60_000);
        expect((await join(app, room.id)).status).toBe(204);
        await room.readEvent();
      } finally {
        await room.close();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('room lifetimes and isolation', () => {
  it.each([false, true])('isolates clients with trustIngress=%s', async (trustIngress) => {
    const app = createGameRoutes(undefined, { trustIngress, roomsPerPeer: 1 });
    const open = (socket: string, forwarded: string) =>
      app.request(
        '/rtd',
        {
          headers: { 'X-Forwarded-For': forwarded },
        },
        { incoming: { socket: { remoteAddress: socket } } },
      );
    const first = await open('192.0.2.1', '192.0.2.3');
    try {
      expect((await open('192.0.2.1', '192.0.2.9, 192.0.2.3')).status).toBe(429);
      const other = await open(trustIngress ? '192.0.2.1' : '192.0.2.2', '192.0.2.4');
      expect(other.status).toBe(200);
      await other.body?.cancel();
    } finally {
      await first.body?.cancel();
    }
    const again = await open('192.0.2.1', '192.0.2.3');
    expect(again.status).toBe(200);
    await again.body?.cancel();
  });

  it('cancels an unfinished upload and admits the next player', async () => {
    const app = createGameRoutes(undefined, { ioMs: 50 });
    const room = await openRoom(app);
    const cancel = vi.fn();
    try {
      const response = await app.request(`/join/${room.id}`, {
        method: 'POST',
        body: new ReadableStream({ cancel }),
        duplex: 'half',
      } as RequestInit);
      expect(response.status).toBe(408);
      expect(cancel).toHaveBeenCalledOnce();
      expect((await join(app, room.id)).status).toBe(204);
    } finally {
      await room.close();
    }
  });

  it('closes a blocked stream and releases its room', async () => {
    const app = createGameRoutes(undefined, { ioMs: 50, roomsPerPeer: 1 });
    const room = await openRoom(app);
    expect((await join(app, room.id)).status).toBe(204);
    expect((await join(app, room.id)).status).toBe(404);
    const next = await openRoom(app);
    await next.close();
  });

  it('expires an unused invite and releases its host slot', async () => {
    const app = createGameRoutes(undefined, { idleMs: 50, roomsPerPeer: 1 });
    const room = await openRoom(app);
    expect(await room.readEvent()).toBeNull();
    expect((await join(app, room.id)).status).toBe(404);
    await room.close();
    await (await openRoom(app)).close();
  });
});

describe('quota boundaries', () => {
  it('keeps host moderation available after guest and invalid-credential budgets are exhausted', async () => {
    const app = createGameRoutes();
    const room = await openRoom(app);
    const remove = (id: string) =>
      app.request(`/join/${room.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${id}` } });
    try {
      expect((await join(app, room.id)).status).toBe(204);
      const player = await room.readEvent();
      for (let i = 1; i < 120; i++) expect((await join(app, room.id, '{}')).status).toBe(400);
      expect((await join(app, room.id)).status).toBe(429);
      for (let i = 0; i < 120; i++) expect((await remove('invalid')).status).toBe(404);
      expect((await remove('invalid')).status).toBe(429);
      expect((await remove(player.id)).status).toBe(204);
      expect((await remove(player.id)).status).toBe(429);
    } finally {
      await room.close();
    }
  });

  it.each([
    ['2001:db8::1', '2001:0DB8:0000:0000:ffff::a', '2001:db8:0:1::1'],
    ['192.0.2.1', '::ffff:c000:201', '::ffff:192.0.2.2'],
  ])('groups equivalent client networks for %s', async (first, same, other) => {
    const app = createGameRoutes(undefined, { trustIngress: true, roomsPerPeer: 1 });
    const open = (ip: string) =>
      app.request(
        '/rtd',
        { headers: { 'X-Forwarded-For': ip } },
        { incoming: { socket: { remoteAddress: '127.0.0.1' } } },
      );
    const room = await open(first);
    try {
      expect(room.status).toBe(200);
      expect((await open(same)).status).toBe(429);
      const separate = await open(other);
      expect(separate.status).toBe(200);
      await separate.body?.cancel();
    } finally {
      await room.body?.cancel();
    }
  });
});

describe('browser and upload admission', () => {
  it('checks browser origin before allocating a room', async () => {
    const app = createGameRoutes(undefined, { roomsPerPeer: 1, browserOrigins: ['https://host.example'] });
    for (const headers of [
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site', Origin: 'https://sibling.example' },
      { Origin: 'https://other.example' },
    ] as Record<string, string>[]) {
      expect((await app.request('/rtd', { headers })).status).toBe(403);
    }
    for (const headers of [
      { 'Sec-Fetch-Site': 'same-origin' },
      { 'Sec-Fetch-Site': 'same-site', Origin: 'https://host.example' },
    ] as Record<string, string>[]) {
      const response = await app.request('/rtd', { headers });
      expect(response.status).toBe(200);
      await response.body?.cancel();
    }
  });

  it('shares pending uploads across rooms by client network and returns slots after cancellation', async () => {
    const app = createGameRoutes();
    const first = await openRoom(app);
    const second = await openRoom(app);
    const controller = new AbortController();
    const requests = [];
    const submit = (id: string, ip: string, body: BodyInit) =>
      app.request(`/join/${id}`, { method: 'POST', duplex: 'half', body, signal: controller.signal } as RequestInit, {
        incoming: { socket: { remoteAddress: ip }, complete: true },
      });
    try {
      for (let i = 0; i < 8; i++) {
        requests.push(submit(i % 2 ? first.id : second.id, '2001:db8::1', new ReadableStream()));
      }
      expect((await submit(second.id, '2001:db8::2', '{}')).status).toBe(429);
      expect((await submit(second.id, '2001:db8:1::1', JSON.stringify(guest))).status).toBe(204);
      await second.readEvent();
      controller.abort();
      await Promise.all(requests);
      const result = await app.request(
        `/join/${first.id}`,
        { method: 'POST', body: JSON.stringify(guest) },
        { incoming: { socket: { remoteAddress: '2001:db8::2' } } },
      );
      expect(result.status).toBe(204);
    } finally {
      controller.abort();
      await Promise.all(requests);
      await first.close();
      await second.close();
    }
  });
});
