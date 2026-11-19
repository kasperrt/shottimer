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
      expect(room.id).toMatch(/^[\w-]{21}$/);
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
      expect((await join(app, second.id)).status).toBe(204);
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
