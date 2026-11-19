import qrcode from 'qrcode';
import { createEffect, Show } from 'solid-js';

export function Join(props: { gameId: string | null }) {
  let canvas!: HTMLCanvasElement;
  const url = () => (props.gameId ? new URL(props.gameId, window.location.origin).href : undefined);
  createEffect(url, (href) => {
    if (href) {
      qrcode.toCanvas(
        canvas,
        href,
        {
          errorCorrectionLevel: 'H',
          margin: 4,
          scale: 6,
          color: { dark: '#111111', light: '#00000000' },
        },
        (error) => {
          if (error) console.error('Could not render join code', error);
        },
      );
    }
  });
  return (
    <a class="join-link" href={url()} target="_blank" rel="noreferrer" aria-busy={props.gameId ? 'false' : 'true'}>
      <span class="join-code">
        <canvas
          ref={canvas}
          style={{ visibility: props.gameId ? 'visible' : 'hidden' }}
          aria-label="Scan to join the game"
        />
        <Show when={props.gameId}>
          <svg class="join-code-logo" viewBox="-8 0 124 146" aria-hidden="true">
            <image href="/assets/favicon.png" width="150" height="150" />
          </svg>
        </Show>
      </span>
      <span>
        Scan to join
        <small>{props.gameId ? `${window.location.host}/${props.gameId}` : 'Connecting…'}</small>
      </span>
    </a>
  );
}
