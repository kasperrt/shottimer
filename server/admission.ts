import { isIP } from 'node:net';
import type { HttpBindings } from '@hono/node-server';
import type { Context } from 'hono';
import ipaddr from 'ipaddr.js';

export type GameEnv = { Bindings: HttpBindings };

export function peer<E extends GameEnv>(ctx: Context<E>, trustIngress: boolean) {
  const socket = ctx.env?.incoming?.socket.remoteAddress;
  // Enable only on a listener restricted to the single trusted ingress hop.
  const lastHop = trustIngress && socket && ctx.req.header('X-Forwarded-For')?.split(',').at(-1)?.trim();
  const address = lastHop && isIP(lastHop) ? lastHop : socket;
  if (!address) return 'local';
  const ip = ipaddr.process(address.split('%')[0]);
  if (ip.kind() === 'ipv4') return ip.toString();
  return Buffer.from(ip.toByteArray().slice(0, 8)).toString('hex');
}

const maxBytes = 192 * 1024;

export async function readPlayer<E extends GameEnv>(ctx: Context<E>, closed: AbortSignal, deadline: number) {
  const request = ctx.req.raw;
  const reader = request.body?.getReader();
  if (!reader) return ctx.text('Invalid JSON.', 400);
  const timeout = AbortSignal.timeout(deadline);
  const signal = AbortSignal.any([request.signal, closed, timeout]);
  let cancelled = false;
  function cancel() {
    if (cancelled) return;
    cancelled = true;
    void reader?.cancel().catch(() => {});
    const incoming = ctx.env?.incoming;
    if (incoming && !incoming.complete && !incoming.destroyed) {
      ctx.header('Connection', 'close');
      ctx.env.outgoing.once('finish', () => incoming.destroy());
    }
  }
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (Number(request.headers.get('Content-Length')) > maxBytes) {
      cancel();
      return ctx.text('Portrait too large.', 413);
    }
    const buffer = Buffer.allocUnsafe(maxBytes);
    let size = 0;
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maxBytes) {
        cancel();
        return ctx.text('Portrait too large.', 413);
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
    if (signal.aborted) {
      cancel();
      return timeout.aborted ? ctx.text('Upload timed out.', 408) : ctx.text('Game closed.', 404);
    }
    return { input: JSON.parse(buffer.toString('utf8', 0, size)) as unknown };
  } catch {
    return ctx.text('Invalid JSON.', 400);
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
