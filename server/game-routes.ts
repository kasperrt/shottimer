import { type Context, Hono } from 'hono';
import { type SSEStreamingApi, streamSSE } from 'hono/streaming';
import { nanoid } from 'nanoid';
import { maxRemotePlayers, simplePlayerSchema } from '../src/types/types.js';
import { type GameEnv, peer, readPlayer } from './admission.js';

interface Room {
  stream: SSEStreamingApi;
  players: Set<string>;
  pending: number;
  closed: AbortController;
  touch: () => void;
  send: (event: string, data: string) => Promise<void>;
}

// A process-wide ceiling bounds both work and the number of keys retained per window.
class MinuteBudget {
  private until = 0;
  private total = 0;
  private counts = new Map<string, number>();

  constructor(
    private readonly maximum: number,
    private readonly perKey: number,
  ) {}

  take(key: string) {
    const now = Date.now();
    if (now >= this.until) {
      this.counts.clear();
      this.total = 0;
      this.until = now + 60_000;
    }
    const count = this.counts.get(key) ?? 0;
    if (this.total >= this.maximum || count >= this.perKey) return false;
    this.counts.set(key, count + 1);
    this.total++;
    return true;
  }
}

function throttled(ctx: Context) {
  ctx.header('Retry-After', '60');
  return ctx.text('Please try again in a minute.', 429);
}

export function createGameRoutes(
  newInvite: () => string = nanoid,
  { trustIngress = false, roomsPerPeer = 8, idleMs = 90 * 60_000, ioMs = 10_000 } = {},
) {
  const rooms = new Map<string, Room>();
  const active = new Map<string, number>();
  const starts = new MinuteBudget(240, 60);
  const joins = new MinuteBudget(1200, 300);
  let pendingJoins = 0;
  const invalidRemovals = new MinuteBudget(1200, 120);
  const hostRemovals = new MinuteBudget(256 * 120, 120);
  const roomRequests = new MinuteBudget(1200, 120);
  const routes = new Hono<GameEnv & { Variables: { room: Room } }>();

  routes.get('/rtd', (ctx) => {
    const key = peer(ctx, trustIngress);
    const count = active.get(key) ?? 0;
    if (rooms.size >= 256 || count >= roomsPerPeer || !starts.take(key)) return throttled(ctx);
    let id = newInvite();
    while (rooms.has(id)) id = newInvite();
    return streamSSE(ctx, async (stream) => {
      const closed = new AbortController();
      const disconnected = new Promise<void>((resolve) => stream.onAbort(resolve));
      async function send(event: string, data: string) {
        const timer = setTimeout(() => {
          stream.abort();
          ctx.env?.outgoing?.destroy();
        }, ioMs);
        try {
          await stream.writeSSE({ event, data });
        } finally {
          clearTimeout(timer);
        }
      }
      const idle = setTimeout(() => {
        closed.abort();
        void send('expired', 'null').finally(() => stream.abort());
      }, idleMs);
      const room = { stream, players: new Set<string>(), pending: 0, closed, touch: () => idle.refresh(), send };
      active.set(key, count + 1);
      rooms.set(id, room);
      const heartbeat = setInterval(() => void send('ping', 'keepalive'), 30_000);
      stream.onAbort(() => {
        closed.abort();
        clearTimeout(idle);
        clearInterval(heartbeat);
        rooms.delete(id);
        const remaining = (active.get(key) ?? 1) - 1;
        if (remaining) active.set(key, remaining);
        else active.delete(key);
      });
      await send('join', JSON.stringify({ id }));
      await disconnected;
    });
  });

  routes.post(
    '/join/:id',
    async (ctx, next) => {
      if (!joins.take(peer(ctx, trustIngress))) return throttled(ctx);
      const id = ctx.req.param('id');
      const room = rooms.get(id);
      if (!room || room.closed.signal.aborted || room.stream.aborted) return ctx.text('Game closed.', 404);
      if (!roomRequests.take(id)) return throttled(ctx);
      ctx.set('room', room);
      if (room.players.size >= maxRemotePlayers) return ctx.text('Game full.', 409);
      if (room.pending >= 12 || pendingJoins >= 32) return throttled(ctx);
      room.pending++;
      pendingJoins++;
      try {
        await next();
      } finally {
        room.pending--;
        pendingJoins--;
      }
    },
    async (ctx) => {
      const room = ctx.get('room');
      const body = await readPlayer(ctx, room.closed.signal, ioMs);
      if (!('input' in body)) return body;
      const parsed = simplePlayerSchema.safeParse(body.input);
      if (!parsed.success) return ctx.text('Invalid player or portrait.', 400);
      if (room.closed.signal.aborted || room.stream.aborted || rooms.get(ctx.req.param('id')) !== room)
        return ctx.text('Game closed.', 404);
      if (room.players.size >= maxRemotePlayers) return ctx.text('Game full.', 409);
      const player = { ...parsed.data, id: nanoid(), joined: Date.now(), score: 0 };
      // Reserve before yielding. Only the host receives this opaque player ID over its private stream.
      room.players.add(player.id);
      try {
        await room.send('player', JSON.stringify(player));
        if (room.closed.signal.aborted || room.stream.aborted) return ctx.text('Game closed.', 404);
        room.touch();
        return ctx.body(null, 204);
      } catch {
        room.players.delete(player.id);
        return ctx.text('Game closed.', 503);
      }
    },
  );

  routes.delete('/join/:id', (ctx) => {
    const id = ctx.req.param('id');
    const room = rooms.get(id);
    const credential = ctx.req.header('Authorization') ?? '';
    const playerId = credential.slice(7);
    if (
      !room ||
      room.closed.signal.aborted ||
      room.stream.aborted ||
      !credential.startsWith('Bearer ') ||
      !room.players.has(playerId)
    ) {
      if (!invalidRemovals.take(peer(ctx, trustIngress))) return throttled(ctx);
      return ctx.text('Unknown player.', 404);
    }
    if (!hostRemovals.take(id)) return throttled(ctx);
    room.players.delete(playerId);
    room.touch();
    return ctx.body(null, 204);
  });
  return routes;
}
