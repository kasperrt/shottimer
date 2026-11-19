import qrcode from 'qrcode';
import { createMemo, Loading, Show } from 'solid-js';

function Code(props: { url: string }) {
  const image = createMemo(() =>
    qrcode.toDataURL(props.url, {
      errorCorrectionLevel: 'H',
      margin: 4,
      scale: 8,
      color: { dark: '#192f28', light: '#00000000' },
    }),
  );
  return (
    <span class="join-code">
      <img width="112" height="112" src={image()} alt="Scan to join the game" />
      <svg class="join-code-logo" viewBox="-8 0 124 146" aria-hidden="true">
        <image href="/assets/favicon.png" width="150" height="150" />
      </svg>
    </span>
  );
}

export function Join(props: { gameId: string | null }) {
  const url = () => `${window.location.origin}/${props.gameId}`;
  return (
    <Show when={props.gameId}>
      <a class="join-link" href={url()} target="_blank" rel="noreferrer">
        <Loading>
          <Code url={url()} />
        </Loading>
        <span>
          Join on your phone
          <small>
            {window.location.host}/{props.gameId}
          </small>
        </span>
      </a>
    </Show>
  );
}
