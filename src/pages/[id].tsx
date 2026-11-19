import { useParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { getHttpError } from 'wiretyped';
import { httpClient } from '@/lib/http';
import { maxDrawingPoints, maxNameLength } from '@/types/types';
import { getRandomColor } from '@/utils/color';
import { draw } from '@/utils/draw';

// Keep one coordinate system across rotation, screen densities and the host display.
const side = 960;

export default function JoinGame() {
  const params = useParams<{ id: string }>();
  const [name, setName] = createSignal('');
  const [status, setStatus] = createSignal<'editing' | 'sending' | 'joined'>('editing');
  const [hasInk, setHasInk] = createSignal(false);
  const [error, setError] = createSignal('');
  const portrait = {
    width: side,
    height: side,
    x: [] as number[],
    y: [] as number[],
    drag: [] as boolean[],
    color: getRandomColor(),
  };
  let pointer: number | null = null;

  function mark(canvas: HTMLCanvasElement, event: PointerEvent, drag: boolean) {
    if (portrait.x.length >= maxDrawingPoints) {
      setError('Your portrait is full. You can still join with this drawing.');
      return;
    }
    const rect = canvas.getBoundingClientRect();
    portrait.x.push(Math.max(0, Math.min(side, Math.round(((event.clientX - rect.left) * side) / rect.width))));
    portrait.y.push(Math.max(0, Math.min(side, Math.round(((event.clientY - rect.top) * side) / rect.height))));
    portrait.drag.push(drag);
    draw({ canvas, ...portrait });
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!name().trim() || status() !== 'editing') return;
    setStatus('sending');
    setError('');
    try {
      const [failure] = await httpClient.post(
        '/join/{id}',
        { id: params.id },
        { name: name().trim(), drawing: portrait },
      );
      if (failure) throw failure;
      setStatus('joined');
    } catch (error) {
      const messages: Partial<Record<number, string>> = {
        404: 'This game has closed. Scan the host’s current code.',
        409: 'This game is full. Ask the host to remove a player.',
        429: 'Too many requests. Try again in a minute.',
      };
      setError(messages[getHttpError(error)?.response.status ?? 0] ?? 'Couldn’t join the game. Try again.');
      setStatus('editing');
    }
  }

  return (
    <main class="join-page">
      <Show
        when={status() !== 'joined'}
        fallback={
          <section class="receipt">
            <h1>You’re in!</h1>
            <p>You can close this tab.</p>
          </section>
        }
      >
        <form autocomplete="off" class="portrait-form" onSubmit={submit}>
          <header class="portrait-header">
            <h1>Join the game</h1>
            <label for="player-name">Your name</label>
            <input
              id="player-name"
              name="name"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="none"
              spellcheck={false}
              maxlength={maxNameLength}
              required
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </header>
          <div class="portrait-space">
            <div class="paper">
              <canvas
                width={side}
                height={side}
                aria-label="Draw your portrait"
                onPointerDown={(e) => {
                  if (e.button !== 0 || pointer !== null || status() !== 'editing') return;
                  pointer = e.pointerId;
                  e.currentTarget.setPointerCapture(pointer);
                  mark(e.currentTarget, e, false);
                  setHasInk(true);
                }}
                onPointerMove={(e) => {
                  if (e.pointerId === pointer) mark(e.currentTarget, e, true);
                }}
                onLostPointerCapture={(e) => {
                  if (e.pointerId === pointer) pointer = null;
                }}
              />
              <Show when={!hasInk()}>
                <span>Draw your portrait</span>
              </Show>
            </div>
          </div>
          <footer>
            <p role="alert">{error()}</p>
            <button type="submit" disabled={status() === 'sending'}>
              {status() === 'sending' ? 'Joining…' : 'Join game'}
            </button>
          </footer>
        </form>
      </Show>
    </main>
  );
}
