import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { type SSEStreamingApi, streamSSE } from 'hono/streaming';
import { nanoid } from 'nanoid';
import { maxRemotePlayers, simplePlayerSchema } from '../src/types/types.js';

interface Room {
  stream: SSEStreamingApi;
  players: Set<string>;
  pending: number;
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

function peer(ctx: Context) {
  // The socket peer may be a shared ingress. Never accept a client-supplied forwarding header as identity.
  return ctx.env?.incoming?.socket.remoteAddress ?? 'local';
}

function throttled(ctx: Context) {
  ctx.header('Retry-After', '60');
  return ctx.text('Please try again in a minute.', 429);
}

export function createGameRoutes(newInvite: () => string = nanoid) {
  const rooms = new Map<string, Room>();
  const starts = new MinuteBudget(240, 60);
  const joins = new MinuteBudget(1200, 300);
  let pendingJoins = 0;
  const roomRequests = new MinuteBudget(1200, 120);
  const routes = new Hono<{ Variables: { room: Room } }>();

  routes.get('/rtd', (ctx) => {
    if (rooms.size >= 256 || !starts.take(peer(ctx))) return throttled(ctx);
    let id = newInvite();
    while (rooms.has(id)) id = newInvite();
    return streamSSE(ctx, async (stream) => {
      const room = { stream, players: new Set<string>(), pending: 0 };
      rooms.set(id, room);
      const disconnected = new Promise<void>((resolve) => stream.onAbort(resolve));
      let pingPending = false;
      const heartbeat = setInterval(async () => {
        if (pingPending) return;
        pingPending = true;
        try {
          await stream.writeSSE({ event: 'ping', data: 'keepalive' });
        } catch {
          stream.abort();
        } finally {
          pingPending = false;
        }
      }, 30_000);
      try {
        await stream.writeSSE({ event: 'join', data: JSON.stringify({ id }) });
        await disconnected;
      } finally {
        clearInterval(heartbeat);
        if (rooms.get(id) === room) rooms.delete(id);
      }
    });
  });

  routes.use('/join/:id', async (ctx, next) => {
    if (!joins.take(peer(ctx))) return throttled(ctx);
    const id = ctx.req.param('id');
    const room = rooms.get(id);
    if (!room || room.stream.aborted) return ctx.text('Game closed.', 404);
    if (!roomRequests.take(id)) return throttled(ctx);
    ctx.set('room', room);
    await next();
  });

  routes.post(
    '/join/:id',
    async (ctx, next) => {
      const room = ctx.get('room');
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
    bodyLimit({ maxSize: 192 * 1024, onError: (ctx) => ctx.text('Portrait too large.', 413) }),
    async (ctx) => {
      let input: unknown;
      try {
        input = await ctx.req.json();
      } catch {
        return ctx.text('Invalid JSON.', 400);
      }
      const parsed = simplePlayerSchema.safeParse(input);
      if (!parsed.success) return ctx.text('Invalid player or portrait.', 400);
      const room = ctx.get('room');
      if (room.stream.aborted || rooms.get(ctx.req.param('id')) !== room) return ctx.text('Game closed.', 404);
      if (room.players.size >= maxRemotePlayers) return ctx.text('Game full.', 409);
      const player = { ...parsed.data, id: nanoid(), joined: Date.now(), score: 0 };
      // Reserve before yielding. Only the host receives this opaque player ID over its private stream.
      room.players.add(player.id);
      try {
        await room.stream.writeSSE({ event: 'player', data: JSON.stringify(player) });
        if (room.stream.aborted) return ctx.text('Game closed.', 404);
        return ctx.body(null, 204);
      } catch {
        room.players.delete(player.id);
        return ctx.text('Game closed.', 503);
      }
    },
  );

  routes.delete('/join/:id', (ctx) => {
    const credential = ctx.req.header('Authorization') ?? '';
    if (!credential.startsWith('Bearer ') || !ctx.get('room').players.delete(credential.slice(7))) {
      return ctx.text('Unknown player.', 404);
    }
    return ctx.body(null, 204);
  });
  return routes;
}
